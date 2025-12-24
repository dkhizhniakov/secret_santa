import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import { Home } from "@mui/icons-material";
import * as api from "../services/api";

const JoinRaffle = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const hasAttemptedJoin = useRef(false);

  const joinMutation = useMutation({
    mutationFn: (inviteCode: string) => api.joinRaffle(inviteCode),
    onSuccess: (raffle) => {
      navigate(`/raffle/${raffle.id}`);
    },
    onError: (error: any) => {
      // Если статус 409 - пользователь уже участник, перенаправляем на страницу рафла
      if (error.response?.status === 409) {
        const raffleId = error.response?.data?.raffle_id;
        if (raffleId) {
          navigate(`/raffle/${raffleId}`);
        } else {
          // Fallback: попробуем найти в списке рафлов
          api.getRaffles().then((raffles) => {
            const existingRaffle = raffles.find((r) => r.inviteCode === code);
            if (existingRaffle) {
              navigate(`/raffle/${existingRaffle.id}`);
            }
          });
        }
      }
    },
  });

  useEffect(() => {
    if (!code) return;

    // Предотвращаем повторные вызовы (решает проблему с React StrictMode)
    if (!hasAttemptedJoin.current) {
      hasAttemptedJoin.current = true;
      joinMutation.mutate(code);
    }
  }, [code, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Card sx={{ maxWidth: 400, textAlign: "center" }}>
        <CardContent sx={{ p: 4 }}>
          {joinMutation.isPending ? (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="h6">{t("joinRaffle.joining")}</Typography>
            </>
          ) : joinMutation.isError ? (
            <>
              <Typography variant="h1" sx={{ fontSize: 64, mb: 2 }}>
                😕
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {(joinMutation.error as any).response?.data?.error ||
                  t("joinRaffle.errorJoin")}
              </Alert>
              <Button
                variant="contained"
                startIcon={<Home />}
                onClick={() => navigate("/")}
                fullWidth
              >
                {t("joinRaffle.goHome")}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
};

export default JoinRaffle;
