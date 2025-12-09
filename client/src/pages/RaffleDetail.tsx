import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Skeleton,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack,
  ContentCopy,
  Shuffle,
  Delete,
  CardGiftcard,
  CalendarMonth,
} from '@mui/icons-material';
import * as api from '../services/api';

const RaffleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { data: raffle, isLoading } = useQuery({
    queryKey: ['raffle', id],
    queryFn: () => api.getRaffle(id!),
    enabled: !!id,
  });

  const { data: assignment } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => api.getMyAssignment(id!),
    enabled: !!id && !!raffle?.isDrawn,
  });

  const drawMutation = useMutation({
    mutationFn: () => api.drawNames(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffle', id] });
      queryClient.invalidateQueries({ queryKey: ['assignment', id] });
      showSnackbar('Жеребьевка проведена! 🎉');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteRaffle(id!),
    onSuccess: () => {
      navigate('/');
    },
  });

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleCopyInviteCode = () => {
    if (raffle) {
      const url = `${window.location.origin}/join/${raffle.inviteCode}`;
      navigator.clipboard.writeText(url);
      showSnackbar('Ссылка скопирована в буфер обмена! 📋');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Не указана';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={300} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!raffle) {
    return (
      <Alert severity="error">
        Розыгрыш не найден
      </Alert>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{ mb: 3 }}
      >
        Назад к розыгрышам
      </Button>

      {/* Error Alert */}
      {drawMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(drawMutation.error as any).response?.data?.error || 'Ошибка жеребьевки'}
        </Alert>
      )}
      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(deleteMutation.error as any).response?.data?.error || 'Ошибка удаления'}
        </Alert>
      )}

      {/* Main Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', mb: 3 }}>
            <Avatar 
              src={raffle.avatarUrl || undefined}
              sx={{ width: 80, height: 80 }}
            >
              🎅
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  {raffle.name}
                </Typography>
                {raffle.isDrawn ? (
                  <Chip
                    icon={<CardGiftcard />}
                    label="Жеребьевка проведена"
                    color="success"
                  />
                ) : (
                  <Chip
                    label="Ожидает жеребьевки"
                    color="warning"
                  />
                )}
              </Box>

              {raffle.description && (
                <Typography color="text.secondary" paragraph>
                  {raffle.description}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                {raffle.eventDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonth color="action" />
                    <Typography>
                      <strong>Дата:</strong> {formatDate(raffle.eventDate)}
                    </Typography>
                  </Box>
                )}
                {raffle.budget && (
                  <Typography>
                    <strong>Бюджет:</strong> {raffle.budget}
                  </Typography>
                )}
              </Box>

              {raffle.isOwner && !raffle.isDrawn && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Shuffle />}
                    onClick={() => drawMutation.mutate()}
                    disabled={raffle.members.length < 2 || drawMutation.isPending}
                  >
                    {drawMutation.isPending ? 'Жеребьевка...' : 'Провести жеребьевку'}
                  </Button>
                  <Tooltip title="Скопировать ссылку приглашения">
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopy />}
                      onClick={handleCopyInviteCode}
                    >
                      Пригласить
                    </Button>
                  </Tooltip>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Удалить
                  </Button>
                </Box>
              )}

              {!raffle.isOwner && raffle.isDrawn === false && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Дождитесь когда организатор проведет жеребьевку
                </Alert>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Assignment */}
      {raffle.isDrawn && assignment && (
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🎁 Вы дарите подарок:
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {assignment.receiverName}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Участники ({raffle.members.length})
          </Typography>
          <List>
            {raffle.members.map((member) => (
              <ListItem key={member.id}>
                <ListItemAvatar>
                  <Avatar src={member.avatarUrl || undefined}>
                    {member.name[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={member.name}
                  secondary={member.userId === raffle.ownerId ? 'Организатор' : ''}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить розыгрыш?</DialogTitle>
        <DialogContent>
          Вы уверены, что хотите удалить розыгрыш "{raffle.name}"? Это действие нельзя отменить.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setDeleteDialogOpen(false);
              deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default RaffleDetail;
