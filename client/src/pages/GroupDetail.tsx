import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  TextField,
  IconButton,
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
import { Group, Assignment } from '../types';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';

const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawLoading, setDrawLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [error, setError] = useState('');

  const loadGroup = useCallback(async () => {
    try {
      const data = await api.getGroup(id!);
      setGroup(data);

      if (data.isDrawn) {
        try {
          const assignmentData = await api.getMyAssignment(id!);
          setAssignment(assignmentData);
        } catch {
          // Assignment might not exist for this user
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки группы');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const handleDraw = async () => {
    setDrawLoading(true);
    setError('');

    try {
      const updatedGroup = await api.drawNames(id!);
      setGroup(updatedGroup);
      const assignmentData = await api.getMyAssignment(id!);
      setAssignment(assignmentData);
      showSnackbar('Жеребьевка проведена! 🎉');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка жеребьевки');
    } finally {
      setDrawLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteGroup(id!);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${group?.inviteCode}`;
    navigator.clipboard.writeText(link);
    showSnackbar('Ссылка скопирована!');
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={100} height={40} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  if (error && !group) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ mb: 3 }}>
          Назад
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!group) return null;

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ mb: 3 }}>
        Назад
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Header Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {group.name}
              </Typography>
              {group.description && (
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {group.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {group.isDrawn ? (
                  <Chip label="✅ Жеребьевка проведена" color="success" />
                ) : (
                  <Chip label="⏳ Ожидает жеребьевки" color="warning" />
                )}
                {group.budget && (
                  <Chip label={`💰 ${group.budget}`} variant="outlined" />
                )}
                {group.eventDate && (
                  <Chip
                    icon={<CalendarMonth />}
                    label={formatDate(group.eventDate)}
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            {group.isOwner && (
              <Tooltip title="Удалить группу">
                <IconButton color="error" onClick={() => setDeleteDialogOpen(true)}>
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Invite Link */}
          <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Ссылка для приглашения
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                value={`${window.location.origin}/join/${group.inviteCode}`}
                InputProps={{ readOnly: true }}
              />
              <Button
                variant="contained"
                startIcon={<ContentCopy />}
                onClick={copyInviteLink}
              >
                Копировать
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Assignment Card */}
      {assignment && (
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CardGiftcard sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Вы дарите подарок:
            </Typography>
            <Typography variant="h3" fontWeight={800}>
              🎁 {assignment.receiverName}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Members Card */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700}>
              Участники ({group.members.length})
            </Typography>

            {group.isOwner && !group.isDrawn && (
              <Button
                variant="contained"
                startIcon={<Shuffle />}
                onClick={handleDraw}
                disabled={drawLoading || group.members.length < 3}
              >
                {drawLoading ? 'Жеребьевка...' : 'Провести жеребьевку'}
              </Button>
            )}
          </Box>

          {group.members.length < 3 && !group.isDrawn && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Для жеребьевки нужно минимум 3 участника. Пригласите еще{' '}
              {3 - group.members.length} человек(а).
            </Alert>
          )}

          <List>
            {group.members.map((member) => (
              <ListItem key={member.id}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: member.userId === user?.id ? 'primary.main' : 'grey.400' }}>
                    {member.name[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {member.name}
                      {member.userId === group.ownerId && (
                        <Chip label="Организатор" size="small" color="primary" />
                      )}
                      {member.userId === user?.id && (
                        <Chip label="Вы" size="small" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={member.email}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить группу?</DialogTitle>
        <DialogContent>
          <Typography>
            Это действие нельзя отменить. Все данные группы будут удалены.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
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

export default GroupDetail;

