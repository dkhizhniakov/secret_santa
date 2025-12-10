import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { Home } from '@mui/icons-material';
import * as api from '../services/api';

const JoinRaffle = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const joinMutation = useMutation({
    mutationFn: (inviteCode: string) => api.joinRaffle(inviteCode),
    onSuccess: (raffle) => {
      navigate(`/raffle/${raffle.id}`);
    },
  });

  useEffect(() => {
    if (code) {
      joinMutation.mutate(code);
    }
  }, [code]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          {joinMutation.isPending ? (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="h6">{t("joinRaffle.joining")}</Typography>
            </>
          ) : joinMutation.isError ? (
            <>
              <Typography variant="h1" sx={{ fontSize: 64, mb: 2 }}>😕</Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {(joinMutation.error as any).response?.data?.error || t("joinRaffle.errorJoin")}
              </Alert>
              <Button
                variant="contained"
                startIcon={<Home />}
                onClick={() => navigate('/')}
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
