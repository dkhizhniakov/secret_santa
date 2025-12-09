import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';
import * as api from '../services/api';

const JoinRaffle = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

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
              <Typography variant="h6">Присоединение к розыгрышу...</Typography>
            </>
          ) : joinMutation.isError ? (
            <>
              <Typography variant="h1" sx={{ fontSize: 64, mb: 2 }}>😕</Typography>
              <Alert severity="error">
                {(joinMutation.error as any).response?.data?.error || 'Не удалось присоединиться'}
              </Alert>
            </>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
};

export default JoinRaffle;
