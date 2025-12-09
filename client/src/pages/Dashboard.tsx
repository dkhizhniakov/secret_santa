import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Group as GroupIcon,
  CalendarMonth,
  CheckCircle,
  Add,
  Link as LinkIcon,
} from '@mui/icons-material';
import { Group } from '../types';
import * as api from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return;
    
    setJoinError('');
    setJoining(true);

    try {
      const group = await api.joinGroup(inviteCode.trim());
      setJoinDialogOpen(false);
      setInviteCode('');
      navigate(`/group/${group.id}`);
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Ошибка присоединения');
    } finally {
      setJoining(false);
    }
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
            🎄 Мои группы
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

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : groups.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h1" sx={{ fontSize: 64, mb: 2 }}>🎁</Typography>
            <Typography variant="h5" gutterBottom>
              У вас пока нет групп
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Создайте новую группу или присоединитесь по коду приглашения
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/create')}
              sx={{ mr: 2 }}
            >
              Создать группу
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
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.id}>
              <Card>
                <CardActionArea onClick={() => navigate(`/group/${group.id}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" fontWeight={700}>
                        {group.name}
                      </Typography>
                      {group.isDrawn ? (
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

                    {group.description && (
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
                        {group.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <GroupIcon fontSize="small" />
                        <Typography variant="body2">
                          {group.members.length} участников
                        </Typography>
                      </Box>
                      {group.eventDate && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarMonth fontSize="small" />
                          <Typography variant="body2">
                            {formatDate(group.eventDate)}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {group.budget && (
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
                        💰 Бюджет: {group.budget}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Join Dialog */}
      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Присоединиться к группе</DialogTitle>
        <DialogContent>
          {joinError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {joinError}
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleJoinGroup}
            disabled={!inviteCode.trim() || joining}
          >
            {joining ? 'Присоединение...' : 'Присоединиться'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;

