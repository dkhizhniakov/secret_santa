import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  Divider,
  CircularProgress,
} from "@mui/material";
import { CardGiftcard, Google } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

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

// Extend window for Telegram callback
declare global {
  interface Window {
    onTelegramAuth: (user: TelegramUser) => void;
  }
}

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading, setToken } = useAuth();
  const error = searchParams.get("error");
  const telegramContainerRef = useRef<HTMLDivElement>(null);

  // Setup Telegram widget
  useEffect(() => {
    // Global callback function
    window.onTelegramAuth = async (user: TelegramUser) => {
      try {
        console.log("Telegram auth data:", user);
        const response = await axios.post(`${API_URL}/auth/telegram`, user);
        console.log("Telegram auth response:", response.data);
        await setToken(response.data.token);
        navigate("/");
      } catch (err) {
        console.error("Telegram auth error:", err);
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

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
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
              Secret Santa
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Организуйте обмен подарками с друзьями и коллегами
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error === "no_code" && "Ошибка авторизации: код не получен"}
              {error === "invalid_state" && "Ошибка безопасности: попробуйте снова"}
              {error === "exchange_failed" && "Ошибка обмена токена"}
              {error === "userinfo_failed" &&
                "Не удалось получить данные пользователя"}
              {error === "db_error" && "Ошибка базы данных"}
              {error === "telegram_failed" &&
                "Ошибка авторизации через Telegram"}
              {![
                "no_code",
                "invalid_state",
                "exchange_failed",
                "userinfo_failed",
                "db_error",
                "telegram_failed",
              ].includes(error || "") && "Произошла ошибка при входе"}
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
            Войти через Google
          </Button>

          <Divider sx={{ my: 2 }}>
            <Typography color="text.secondary" variant="body2">
              или
            </Typography>
          </Divider>

          {/* Telegram Login Widget */}
          <Box
            ref={telegramContainerRef}
            sx={{
              display: "flex",
              justifyContent: "center",
              minHeight: 48,
            }}
          />

          <Typography
            align="center"
            color="text.secondary"
            variant="body2"
            sx={{ mt: 4 }}
          >
            Входя, вы соглашаетесь с условиями использования
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
