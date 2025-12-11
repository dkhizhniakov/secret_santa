import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Fab,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  Badge,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Collapse,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import InfoIcon from "@mui/icons-material/Info";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as api from "../services/api";
import { ChatMessage } from "../services/api";
import { containsDangerousContent, MAX_MESSAGE_LENGTH } from "../utils/validator";

const getMessageSchema = (t: (key: string, params?: any) => string) =>
  z.object({
    message: z
      .string()
      .min(1, t("validation.required", "Required"))
      .max(
        MAX_MESSAGE_LENGTH,
        t("validation.maxChars", { count: MAX_MESSAGE_LENGTH })
      )
      .refine(
        (val) => !containsDangerousContent(val),
        t("validation.prohibitedContent", "Contains prohibited content")
      ),
  });

type MessageFormData = z.infer<ReturnType<typeof getMessageSchema>>;

interface AnonymousChatProps {
  raffleId: string;
  memberId: string; // ID текущего пользователя в этом розыгрыше
}

export const AnonymousChat = ({ raffleId, memberId }: AnonymousChatProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0); // 0 = giftee (мой получатель), 1 = santa (мой даритель)
  const [showHint, setShowHint] = useState(true);

  // Сообщения для обеих вкладок
  const [gifteeMessages, setGifteeMessages] = useState<ChatMessage[]>([]);
  const [santaMessages, setSantaMessages] = useState<ChatMessage[]>([]);

  const [loadingGiftee, setLoadingGiftee] = useState(true);
  const [loadingSanta, setLoadingSanta] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [unreadGiftee, setUnreadGiftee] = useState(0);
  const [unreadSanta, setUnreadSanta] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastMessageIdRef = useRef<string | null>(null);

  // React Hook Form с zod валидацией
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(getMessageSchema(t)),
    defaultValues: {
      message: "",
    },
  });

  // Текущие сообщения
  const currentMessages = activeTab === 0 ? gifteeMessages : santaMessages;
  const currentLoading = activeTab === 0 ? loadingGiftee : loadingSanta;

  // Определяем, является ли сообщение моим
  const isMyMessage = useCallback(
    (message: ChatMessage) => {
      // Определяем отправителя сообщения:
      // Если from_santa = true, то отправитель = santa_id
      // Если from_santa = false, то отправитель = giftee_id
      const senderId = message.from_santa
        ? message.santa_id
        : message.giftee_id;
      // Я отправитель, если мой memberId совпадает с ID отправителя
      return senderId === memberId;
    },
    [memberId]
  );

  // Прокрутка вниз при новых сообщениях
  const scrollToBottom = (immediate: boolean = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: immediate ? "instant" : "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gifteeMessages, santaMessages]);

  // Загружаем историю сообщений для обеих вкладок
  const loadMessages = useCallback(async () => {
    // Загружаем сообщения с получателем (я - даритель)
    try {
      setLoadingGiftee(true);
      const messages = await api.getChatWithGiftee(raffleId);
      setGifteeMessages(messages);
    } catch (err: any) {
      console.error("Failed to load giftee messages:", err);
      if (err.response?.status !== 404) {
        setError(err.response?.data?.error || "Failed to load messages");
      }
    } finally {
      setLoadingGiftee(false);
    }

    // Загружаем сообщения с дарителем (я - получатель)
    try {
      setLoadingSanta(true);
      const messages = await api.getChatWithSanta(raffleId);
      setSantaMessages(messages);
    } catch (err: any) {
      console.error("Failed to load santa messages:", err);
      if (err.response?.status !== 404) {
        setError(err.response?.data?.error || "Failed to load messages");
      }
    } finally {
      setLoadingSanta(false);
    }
  }, [raffleId]);

  // Подключение к WebSocket
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not authenticated");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const apiUrl = import.meta.env.VITE_API_URL || "";

    // Определяем базовый URL для WebSocket
    let wsBaseUrl: string;
    if (apiUrl.startsWith("http")) {
      // Если VITE_API_URL - полный URL (http://localhost:8080/api)
      wsBaseUrl = apiUrl.replace(/^https?:\/\//, "");
    } else if (apiUrl.startsWith("/")) {
      // Если VITE_API_URL - относительный путь (/api)
      wsBaseUrl = window.location.host + apiUrl;
    } else {
      // По умолчанию - текущий хост
      wsBaseUrl = window.location.host + "/api";
    }

    const wsUrl = `${protocol}//${wsBaseUrl}/raffles/${raffleId}/chat/ws?token=${encodeURIComponent(
      token
    )}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);

        // Проверяем, не дубликат ли это сообщение
        if (message.id === lastMessageIdRef.current) {
          return;
        }

        lastMessageIdRef.current = message.id;

        // Определяем, к какой вкладке относится сообщение на основе santa_id и giftee_id
        // Если я Santa (мой member_id === santa_id), то переписка идёт в gifteeMessages
        // Если я Giftee (мой member_id === giftee_id), то переписка идёт в santaMessages

        if (message.santa_id === memberId) {
          // Я Санта в этом чате -> сообщения идут в gifteeMessages (вкладка "Chat with your Giftee")
          setGifteeMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        } else if (message.giftee_id === memberId) {
          // Я Получатель в этом чате -> сообщения идут в santaMessages (вкладка "Chat with your Santa")
          setSantaMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }

        // Если чат закрыт, увеличиваем счетчик непрочитанных
        if (!open) {
          if (message.santa_id === memberId) {
            setUnreadGiftee((prev) => prev + 1);
          } else if (message.giftee_id === memberId) {
            setUnreadSanta((prev) => prev + 1);
          }
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Connection error");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);

      // Переподключение через 3 секунды
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Reconnecting...");
        connectWebSocket();
      }, 3000);
    };

    wsRef.current = ws;
  }, [raffleId, open]);

  // Инициализация
  useEffect(() => {
    loadMessages();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [loadMessages, connectWebSocket]);

  // Отправка сообщения
  const handleSend = (data: MessageFormData) => {
    if (
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      setError(t("chat.not_connected", "Not connected"));
      return;
    }

    // Определяем роль: activeTab 0 = пишу своему получателю (я Санта), activeTab 1 = пишу своему Санте (я Получатель)
    const role = activeTab === 0 ? "santa" : "giftee";

    wsRef.current.send(
      JSON.stringify({
        content: data.message.trim(),
        role: role,
      })
    );

    reset();
  };

  // Открытие/закрытие чата
  const handleOpen = () => {
    setOpen(true);
    setUnreadGiftee(0);
    setUnreadSanta(0);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // Сбрасываем счетчик для активной вкладки
    if (newValue === 0) {
      setUnreadGiftee(0);
    } else {
      setUnreadSanta(0);
    }
    // Прокручиваем вниз после переключения вкладки
    setTimeout(() => scrollToBottom(true), 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(handleSend)();
    }
  };

  const chatContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Заголовок */}
      {isMobile ? (
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              💬 {t("chat.anonymous_chat", "Anonymous Chat")}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mr={1}>
              {connected ? (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "white",
                  }}
                />
              ) : (
                <CircularProgress size={16} color="inherit" />
              )}
            </Box>
            <IconButton edge="end" color="inherit" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      ) : (
        <Box
          sx={{
            p: 1,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">
            💬 {t("chat.anonymous_chat", "Anonymous Chat")}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            {connected ? (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "success.main",
                }}
              />
            ) : (
              <CircularProgress size={16} />
            )}
            <Typography variant="caption" color="text.secondary">
              {connected
                ? t("chat.connected", "Connected")
                : t("chat.connecting", "Connecting...")}
            </Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Компактная подсказка */}
      <Collapse
        in={showHint}
        sx={{ mb: showHint ? 2 : 0, p: showHint ? 1 : 0 }}
      >
        <Alert
          severity="info"
          icon={<InfoIcon fontSize="small" />}
          onClose={() => setShowHint(false)}
        >
          <Typography variant="body2">
            💬{" "}
            {t(
              "chat.combined_hint",
              "Chat anonymously using tabs. Stay anonymous — discuss only delivery & preferences."
            )}
          </Typography>
        </Alert>
      </Collapse>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ m: 2, mt: showHint ? 1 : 2, mb: 1 }}
        >
          {error}
        </Alert>
      )}

      {/* Вкладки */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          px: 1,
          minHeight: 48,
          "& .MuiTab-root": {
            minHeight: 48,
            py: 1,
          },
        }}
        variant={isMobile ? "fullWidth" : "standard"}
      >
        <Tab
          icon={<CardGiftcardIcon fontSize="small" />}
          iconPosition="start"
          label={
            <Badge badgeContent={unreadGiftee} color="error">
              {t("chat.my_giftee", "My Giftee")}
            </Badge>
          }
          value={0}
          sx={{ fontSize: "0.875rem" }}
        />
        <Tab
          icon={<SentimentSatisfiedAltIcon fontSize="small" />}
          iconPosition="start"
          label={
            <Badge badgeContent={unreadSanta} color="error">
              {t("chat.my_santa", "My Santa")}
            </Badge>
          }
          value={1}
          sx={{ fontSize: "0.875rem" }}
        />
      </Tabs>

      {/* Сообщения */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          bgcolor: "background.default",
        }}
      >
        {currentLoading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <CircularProgress />
          </Box>
        ) : currentMessages.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
            flexDirection="column"
            gap={2}
          >
            <Typography color="text.secondary" textAlign="center">
              {activeTab === 0
                ? t(
                    "chat.no_messages_giftee",
                    "No messages with your giftee yet. Start the conversation!"
                  )
                : t(
                    "chat.no_messages_santa",
                    "No messages with your santa yet. Start the conversation!"
                  )}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
              px={3}
            >
              {t(
                "chat.use_for",
                "💡 Use chat to clarify delivery details, sizes, preferences, etc."
              )}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {currentMessages.map((message) => {
              const isMine = isMyMessage(message);
              return (
                <Box
                  key={message.id}
                  sx={{
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      maxWidth: "70%",
                      bgcolor: isMine ? "primary.main" : "grey.100",
                      color: isMine ? "primary.contrastText" : "text.primary",
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {message.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 0.5,
                        opacity: 0.7,
                        textAlign: "right",
                      }}
                    >
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Stack>
        )}
      </Box>

      {/* Поле ввода */}
      <Box
        component="form"
        onSubmit={handleSubmit(handleSend)}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          gap: 1,
          bgcolor: "background.paper",
        }}
      >
        <TextField
          {...register("message")}
          fullWidth
          multiline
          maxRows={3}
          placeholder={t("chat.type_message", "Type a message...")}
          onKeyPress={handleKeyPress}
          disabled={!connected}
          size="small"
          error={!!formErrors.message}
          helperText={formErrors.message?.message}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={!connected}
          sx={{ alignSelf: "flex-end" }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Плавающая кнопка чата */}
      <Fab
        color="primary"
        aria-label="chat"
        onClick={handleOpen}
        sx={{
          position: "fixed",
          bottom: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 24 },
          zIndex: 1000,
        }}
      >
        <Badge badgeContent={unreadGiftee + unreadSanta} color="error">
          <ChatIcon />
        </Badge>
      </Fab>

      {/* Диалог чата */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: isMobile ? "100%" : "750px",
            maxHeight: "90vh",
            m: isMobile ? 0 : 2,
          },
        }}
      >
        <DialogContent sx={{ p: 0, height: "100%", overflow: "hidden" }}>
          {chatContent}
        </DialogContent>
      </Dialog>
    </>
  );
};
