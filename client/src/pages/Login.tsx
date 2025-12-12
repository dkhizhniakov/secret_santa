import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { CardGiftcard, Google } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "/api";

// Telegram user data type
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

// VK ID SDK types
interface VKIDPayload {
  code: string;
  device_id: string;
}

interface VKIDAuthData {
  access_token: string;
  id_token: string;
  user_id: number;
}

// Extend window for callbacks
declare global {
  interface Window {
    onTelegramAuth: (user: TelegramUser) => void;
    VKIDSDK: any;
  }
}

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading, setToken } = useAuth();
  const error = searchParams.get("error");
  const telegramContainerRef = useRef<HTMLDivElement>(null);
  const vkContainerRef = useRef<HTMLDivElement>(null);

  // Setup Telegram widget
  useEffect(() => {
    // Global callback function
    window.onTelegramAuth = async (user: TelegramUser) => {
      try {
        console.log("Telegram auth data:", user);
        const response = await api.telegramLogin(user);
        console.log("Telegram auth response:", response);
        await setToken(response.token);

        // Проверяем сохраненный URL для редиректа
        const redirectUrl = sessionStorage.getItem("redirectAfterLogin");
        if (redirectUrl) {
          sessionStorage.removeItem("redirectAfterLogin");
          navigate(redirectUrl);
        } else {
          navigate("/");
        }
      } catch (err: any) {
        console.error("Telegram auth error:", err);
        console.error("Error response:", err.response?.data);
        navigate("/login?error=telegram_failed");
      }
    };

    // Add Telegram widget script
    if (
      telegramContainerRef.current &&
      !telegramContainerRef.current.hasChildNodes()
    ) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", "DKSecretSantaBot");
      script.setAttribute("data-size", "large");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      telegramContainerRef.current.appendChild(script);
    }

    return () => {
      // Cleanup
      delete (window as any).onTelegramAuth;
    };
  }, [navigate, setToken]);

  // Setup VK ID widget
  useEffect(() => {
    // Функция для обработки успешного входа через VK
    const vkidOnSuccess = async (data: VKIDAuthData) => {
      try {
        console.log("VK auth data:", data);
        const response = await api.vkLogin(data.access_token, data.id_token);
        console.log("VK auth response:", response);
        await setToken(response.token);

        // Проверяем сохраненный URL для редиректа
        const redirectUrl = sessionStorage.getItem("redirectAfterLogin");
        if (redirectUrl) {
          sessionStorage.removeItem("redirectAfterLogin");
          navigate(redirectUrl);
        } else {
          navigate("/");
        }
      } catch (err: any) {
        console.error("VK auth error:", err);
        console.error("Error response:", err.response?.data);
        navigate("/login?error=vk_failed");
      }
    };

    const vkidOnError = (error: any) => {
      console.error("VK ID error:", error);
      navigate("/login?error=vk_failed");
    };

    // Загружаем VK ID SDK
    if (!document.getElementById("vk-id-sdk")) {
      const script = document.createElement("script");
      script.id = "vk-id-sdk";
      script.src = "https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js";
      script.async = true;

      script.onload = () => {
        if (
          "VKIDSDK" in window &&
          vkContainerRef.current &&
          !vkContainerRef.current.hasChildNodes()
        ) {
          const VKID = window.VKIDSDK;

          VKID.Config.init({
            app: 54396280, // Ваш VK App ID
            redirectUrl: `${window.location.origin}/api/auth/vk/callback`,
            responseMode: VKID.ConfigResponseMode.Callback,
            source: VKID.ConfigSource.LOWCODE,
            scope: "",
          });

          const oneTap = new VKID.OneTap();

          oneTap
            .render({
              container: vkContainerRef.current,
              showAlternativeLogin: true,
              oauthList: ["ok_ru", "mail_ru"],
            })
            .on(VKID.WidgetEvents.ERROR, vkidOnError)
            .on(
              VKID.OneTapInternalEvents.LOGIN_SUCCESS,
              function (payload: VKIDPayload) {
                const code = payload.code;
                const deviceId = payload.device_id;

                VKID.Auth.exchangeCode(code, deviceId)
                  .then(vkidOnSuccess)
                  .catch(vkidOnError);
              }
            );
        }
      };

      document.head.appendChild(script);
    } else {
      // SDK уже загружен
      if (
        "VKIDSDK" in window &&
        vkContainerRef.current &&
        !vkContainerRef.current.hasChildNodes()
      ) {
        const VKID = window.VKIDSDK;

        VKID.Config.init({
          app: 54396280,
          redirectUrl: `${window.location.origin}/api/auth/vk/callback`,
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: "",
        });

        const oneTap = new VKID.OneTap();

        oneTap
          .render({
            container: vkContainerRef.current,
            showAlternativeLogin: true,
            oauthList: ["ok_ru", "mail_ru"],
          })
          .on(VKID.WidgetEvents.ERROR, vkidOnError)
          .on(
            VKID.OneTapInternalEvents.LOGIN_SUCCESS,
            function (payload: VKIDPayload) {
              const code = payload.code;
              const deviceId = payload.device_id;

              VKID.Auth.exchangeCode(code, deviceId)
                .then(vkidOnSuccess)
                .catch(vkidOnError);
            }
          );
      }
    }
  }, [navigate, setToken]);

  useEffect(() => {
    if (isAuthenticated) {
      // Проверяем сохраненный URL для редиректа
      const redirectUrl = sessionStorage.getItem("redirectAfterLogin");
      if (redirectUrl) {
        sessionStorage.removeItem("redirectAfterLogin");
        navigate(redirectUrl);
      } else {
        navigate("/");
      }
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleYandexLogin = () => {
    window.location.href = `${API_URL}/auth/yandex`;
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #c41e3a 0%, #165b33 100%)",
        }}
      >
        <CircularProgress sx={{ color: "white" }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #c41e3a 0%, #165b33 100%)",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <CardGiftcard sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
            <Typography variant="h4" fontWeight={800} color="primary">
              {t("login.title")}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {t("login.subtitle")}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {t(`login.errors.${error}`) !== `login.errors.${error}`
                ? t(`login.errors.${error}`)
                : t("login.errors.unknown")}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<Google />}
            onClick={handleGoogleLogin}
            sx={{
              mb: 2,
              py: 1.5,
              bgcolor: "#4285f4",
              "&:hover": { bgcolor: "#3367d6" },
            }}
          >
            {t("login.googleButton")}
          </Button>

          {/* Telegram Login Widget */}
          <Box
            ref={telegramContainerRef}
            sx={{
              display: "flex",
              justifyContent: "center",
              minHeight: 48,
            }}
          />

          {/* VK ID Widget */}
          <Box
            ref={vkContainerRef}
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 2,
              minHeight: 48,
            }}
          />

          {/* <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={
              <Box
                component="span"
                sx={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                Я
              </Box>
            }
            onClick={handleYandexLogin}
            sx={{
              mb: 2,
              py: 1.5,
              bgcolor: "#FC3F1D",
              "&:hover": { bgcolor: "#E63600" },
            }}
          >
            {t("login.yandexButton")}
          </Button> */}

          <Typography
            align="center"
            color="text.secondary"
            variant="body2"
            sx={{ mt: 4 }}
          >
            {t("login.termsAccept")}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
