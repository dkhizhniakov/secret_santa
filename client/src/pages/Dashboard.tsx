import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  Avatar,
} from '@mui/material';
import {
  Group as GroupIcon,
  CalendarMonth,
  CheckCircle,
  Add,
  Link as LinkIcon,
} from '@mui/icons-material';
import * as api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const { data: raffles = [], isLoading } = useQuery({
    queryKey: ['raffles'],
    queryFn: api.getRaffles,
  });

  const joinRaffleMutation = useMutation({
    mutationFn: (code: string) => api.joinRaffle(code),
    onSuccess: (raffle) => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      setJoinDialogOpen(false);
      setInviteCode('');
      navigate(`/raffle/${raffle.id}`);
    },
  });

  const handleJoinRaffle = () => {
    if (!inviteCode.trim()) return;
    joinRaffleMutation.mutate(inviteCode.trim());
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            🎄 Мои розыгрыши
          </Typography>
          <Typography color="text.secondary">
            Управляйте своими играми в Тайного Санту
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<LinkIcon />}
          onClick={() => setJoinDialogOpen(true)}
        >
          Присоединиться
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Skeleton variant="rounded" height={200} />
            </Box>
          ))}
        </Box>
      ) : raffles.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h1" sx={{ fontSize: 64, mb: 2 }}>🎁</Typography>
            <Typography variant="h5" gutterBottom>
              У вас пока нет розыгрышей
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Создайте новый розыгрыш или присоединитесь по коду приглашения
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/create')}
              sx={{ mr: 2 }}
            >
              Создать розыгрыш
            </Button>
            <Button
              variant="outlined"
              startIcon={<LinkIcon />}
              onClick={() => setJoinDialogOpen(true)}
            >
              Присоединиться
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {raffles.map((raffle) => (
            <Box key={raffle.id} sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card>
                <CardActionArea onClick={() => navigate(`/raffle/${raffle.id}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                      <Avatar src={raffle.avatarUrl || undefined} sx={{ width: 48, height: 48 }}>
                        🎅
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700}>
                          {raffle.name}
                        </Typography>
                        {raffle.isDrawn ? (
                          <Chip
                            icon={<CheckCircle />}
                            label="Жеребьевка проведена"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label="Ожидает жеребьевки"
                            color="warning"
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>

                    {raffle.description && (
                      <Typography
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {raffle.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <GroupIcon fontSize="small" />
                        <Typography variant="body2">
                          {raffle.members.length} участников
                        </Typography>
                      </Box>
                      {raffle.eventDate && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarMonth fontSize="small" />
                          <Typography variant="body2">
                            {formatDate(raffle.eventDate)}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {raffle.budget && (
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 2,
                          p: 1,
                          bgcolor: 'secondary.main',
                          color: 'white',
                          borderRadius: 1,
                          display: 'inline-block',
                        }}
                      >
                        💰 Бюджет: {raffle.budget}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {/* Join Dialog */}
      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Присоединиться к розыгрышу</DialogTitle>
        <DialogContent>
          {joinRaffleMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(joinRaffleMutation.error as any).response?.data?.error || 'Ошибка присоединения'}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="Код приглашения"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Например: abc12345"
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleJoinRaffle();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleJoinRaffle}
            disabled={!inviteCode.trim() || joinRaffleMutation.isPending}
          >
            {joinRaffleMutation.isPending ? 'Присоединение...' : 'Присоединиться'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
