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
  Divider,
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

// Extend window for Telegram callback
declare global {
  interface Window {
    onTelegramAuth: (user: TelegramUser) => void;
  }
}

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
        const response = await api.telegramLogin(user);
        console.log("Telegram auth response:", response);
        await setToken(response.token);
        
        // Проверяем сохраненный URL для редиректа
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectAfterLogin');
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

  useEffect(() => {
    if (isAuthenticated) {
      // Проверяем сохраненный URL для редиректа
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectUrl);
      } else {
        navigate("/");
      }
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

          <Divider sx={{ my: 2 }}>
            <Typography color="text.secondary" variant="body2">
              {t("common.or")}
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
            {t("login.termsAccept")}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
