import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { ParticipantProfileDialog } from '../components/ParticipantProfileDialog';
import { ParticipantProfile } from '../types';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [joinedRaffleId, setJoinedRaffleId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<ParticipantProfile | null>(null);

  const { data: raffles = [], isLoading } = useQuery({
    queryKey: ['raffles'],
    queryFn: api.getRaffles,
  });

  // Загрузить профиль пользователя
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
    retry: false,
  });

  useEffect(() => {
    if (profile) {
      setUserProfile({
        phone: profile.phone,
        about: profile.about,
        address_line1: profile.address_line1,
        address_line2: profile.address_line2,
        city: profile.city,
        region: profile.region,
        postal_code: profile.postal_code,
        country: profile.country,
        address_line1_en: profile.address_line1_en,
        address_line2_en: profile.address_line2_en,
        city_en: profile.city_en,
        region_en: profile.region_en,
        wishlist: profile.wishlist,
        anti_wishlist: profile.anti_wishlist,
      });
    }
  }, [profile]);

  const joinRaffleMutation = useMutation({
    mutationFn: (code: string) => api.joinRaffle(code),
    onSuccess: (raffle) => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      setJoinDialogOpen(false);
      setInviteCode('');
      // Показать диалог профиля
      setJoinedRaffleId(raffle.id);
      setProfileDialogOpen(true);
    },
  });

  const handleJoinRaffle = () => {
    if (!inviteCode.trim()) return;
    // Извлекаем код из ссылки если вставили полную ссылку
    const codeMatch = inviteCode.match(/\/join\/([a-zA-Z0-9]+)/);
    const code = codeMatch ? codeMatch[1] : inviteCode.trim();
    joinRaffleMutation.mutate(code);
  };

  const handleProfileDialogClose = () => {
    setProfileDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['raffles'] });
    if (joinedRaffleId) {
      navigate(`/raffle/${joinedRaffleId}`);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: { xs: 3, sm: 4 },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            🎄 {t("dashboard.title")}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {t("dashboard.subtitle")}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<LinkIcon sx={{ display: { xs: 'none', sm: 'block' } }} />}
          onClick={() => setJoinDialogOpen(true)}
          sx={{ minWidth: { sm: 140 }, width: { xs: '100%', sm: 'auto' } }}
        >
          {t("dashboard.join")}
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ flex: '1 1 100%', minWidth: { xs: '100%', sm: '280px', md: '300px' } }}>
              <Skeleton variant="rounded" height={200} />
            </Box>
          ))}
        </Box>
      ) : raffles.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: { xs: 6, sm: 8 } }}>
          <CardContent>
            <Typography variant="h1" sx={{ fontSize: { xs: 48, sm: 64 }, mb: 2 }}>🎁</Typography>
            <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              {t("dashboard.empty.title")}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              {t("dashboard.empty.subtitle")}
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center'
            }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/create')}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {t("dashboard.empty.create")}
              </Button>
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={() => setJoinDialogOpen(true)}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {t("dashboard.join")}
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
          {raffles.map((raffle) => (
            <Box key={raffle.id} sx={{ flex: '1 1 100%', minWidth: { xs: '100%', sm: '280px', md: '300px' } }}>
              <Card>
                <CardActionArea onClick={() => navigate(`/raffle/${raffle.id}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                      <Avatar src={raffle.avatarUrl || undefined} sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 } }}>
                        🎅
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                          {raffle.name}
                        </Typography>
                        {raffle.isDrawn ? (
                          <Chip
                            icon={<CheckCircle />}
                            label={t("dashboard.status.drawn")}
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label={t("dashboard.status.pending")}
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

                    <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, color: 'text.secondary', flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <GroupIcon fontSize="small" />
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {raffle.members.length} {t("common.participants")}
                        </Typography>
                      </Box>
                      {raffle.eventDate && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarMonth fontSize="small" />
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
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
                        💰 {t("dashboard.budget")}: {raffle.budget}
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
      <Dialog 
        open={joinDialogOpen} 
        onClose={() => setJoinDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: { m: { xs: 2, sm: 3 }, width: { xs: 'calc(100% - 32px)', sm: '100%' } }
        }}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
          {t("dashboard.joinDialog.title")}
        </DialogTitle>
        <DialogContent>
          {joinRaffleMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(joinRaffleMutation.error as any).response?.data?.error || t("dashboard.joinDialog.error")}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label={t("dashboard.joinDialog.inviteCodeLabel")}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder={t("dashboard.joinDialog.inviteCodePlaceholder")}
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleJoinRaffle();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleJoinRaffle}
            disabled={!inviteCode.trim() || joinRaffleMutation.isPending}
          >
            {joinRaffleMutation.isPending ? t("dashboard.joinDialog.joining") : t("dashboard.joinDialog.join")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Participant Profile Dialog */}
      {joinedRaffleId && (
        <ParticipantProfileDialog
          open={profileDialogOpen}
          onClose={handleProfileDialogClose}
          raffleId={joinedRaffleId}
          initialData={userProfile || undefined}
        />
      )}
    </Box>
  );
};

export default Dashboard;
