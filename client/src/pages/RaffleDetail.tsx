import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import * as api from '../services/api';
import { ParticipantProfileDialog } from '../components/ParticipantProfileDialog';
import { ParticipantProfile } from '../types';

const RaffleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<ParticipantProfile | null>(null);

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

  // Загрузить текущего пользователя
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: api.getMe,
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

  const drawMutation = useMutation({
    mutationFn: () => api.drawNames(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffle', id] });
      queryClient.invalidateQueries({ queryKey: ['assignment', id] });
      showSnackbar(t('raffleDetail.drawSuccess'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteRaffle(id!),
    onSuccess: () => {
      navigate('/');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (profile: ParticipantProfile) =>
      api.updateMyRaffleProfile(id!, profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffle', id] });
      setProfileDialogOpen(false);
      showSnackbar(t('raffleDetail.profileUpdated'));
    },
  });

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleCopyInviteCode = () => {
    if (raffle) {
      navigator.clipboard.writeText(raffle.inviteCode);
      showSnackbar(t('raffleDetail.codeCopied'));
    }
  };

  const handleCopyInviteLink = () => {
    if (raffle) {
      const url = `${window.location.origin}/join/${raffle.inviteCode}`;
      navigator.clipboard.writeText(url);
      showSnackbar(t('raffleDetail.linkCopied'));
    }
  };

  const handleProfileSubmit = async (data: ParticipantProfile) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const formatDate = (date: string | null) => {
    if (!date) return t('raffleDetail.notSpecified');
    return new Date(date).toLocaleDateString(i18n.language, {
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
        {t('raffleDetail.notFound')}
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
        {t('common.back')}
      </Button>

      {/* Error Alert */}
      {drawMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(drawMutation.error as any).response?.data?.error || t('raffleDetail.drawError')}
        </Alert>
      )}
      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(deleteMutation.error as any).response?.data?.error || t('common.delete')}
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
                    label={t('dashboard.status.drawn')}
                    color="success"
                  />
                ) : (
                  <Chip
                    label={t('dashboard.status.pending')}
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
                      <strong>{t('raffleDetail.eventDate')}:</strong> {formatDate(raffle.eventDate)}
                    </Typography>
                  </Box>
                )}
                {raffle.budget && (
                  <Typography>
                    <strong>{t('raffleDetail.budget')}:</strong> {raffle.budget}
                  </Typography>
                )}
              </Box>

              {raffle.isOwner && !raffle.isDrawn && currentUser && (
                <>
                  {/* Проверка минимального количества участников */}
                  {raffle.members.length < 3 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {t('raffleDetail.needMoreParticipants', { 
                        current: raffle.members.length, 
                        needed: 3 
                      })}
                    </Alert>
                  )}

                  {/* Проверка заполненности профилей */}
                  {raffle.members.length >= 3 && !raffle.members.every(m => m.isProfileFilled) && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      {t('raffleDetail.profilesNotFilled')}
                      {/* Если сам организатор не заполнил профиль */}
                      {raffle.members.find(m => m.userId === currentUser.id)?.isProfileFilled === false && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => setProfileDialogOpen(true)}
                          sx={{ ml: 2 }}
                        >
                          {t('raffleDetail.fillMyProfile')}
                        </Button>
                      )}
                    </Alert>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<Shuffle />}
                      onClick={() => drawMutation.mutate()}
                      disabled={
                        raffle.members.length < 3 || 
                        drawMutation.isPending || 
                        !raffle.members.every(m => m.isProfileFilled)
                      }
                    >
                      {drawMutation.isPending ? t('raffleDetail.drawing') : t('raffleDetail.drawButton')}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopy />}
                      onClick={handleCopyInviteCode}
                    >
                      {t('raffleDetail.copyCode')}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopy />}
                      onClick={handleCopyInviteLink}
                    >
                      {t('raffleDetail.copyLink')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      {t('raffleDetail.deleteButton')}
                    </Button>
                  </Box>
                </>
              )}

              {!raffle.isOwner && raffle.isDrawn === false && currentUser && (
                <>
                  {/* Проверяем, заполнен ли профиль текущего пользователя */}
                  {raffle.members.find(m => m.userId === currentUser.id)?.isProfileFilled === false && (
                    <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2">
                          {t('raffleDetail.yourProfileNotFilled')}
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => setProfileDialogOpen(true)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {t('raffleDetail.fillProfile')}
                        </Button>
                      </Box>
                    </Alert>
                  )}
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {t('raffleDetail.notDrawnYet')}
                  </Alert>
                </>
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
              🎁 {t('raffleDetail.yourGiftee')}:
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
              {assignment.receiverName}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate(`/raffle/${id}/giftee`)}
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
            >
              {t('raffleDetail.viewGifteeProfile')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('raffleDetail.participants')} ({raffle.members.length})
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
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {member.name}
                      {member.isProfileFilled ? (
                        <CheckCircle fontSize="small" sx={{ color: 'success.main' }} />
                      ) : (
                        <Warning fontSize="small" sx={{ color: 'warning.main' }} />
                      )}
                    </Box>
                  }
                  secondary={member.userId === raffle.ownerId ? t('raffleDetail.organizer') : ''}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'flex', gap: 2, mt: 2, px: 2, pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CheckCircle fontSize="small" sx={{ color: 'success.main' }} />
              <Typography variant="body2" color="text.secondary">
                {t('raffleDetail.profileFilled')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Warning fontSize="small" sx={{ color: 'warning.main' }} />
              <Typography variant="body2" color="text.secondary">
                {t('raffleDetail.profileNotFilled')}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('raffleDetail.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          {t('raffleDetail.deleteConfirmText')}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setDeleteDialogOpen(false);
              deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t('raffleDetail.deleting') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Participant Profile Dialog */}
      <ParticipantProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        onSubmit={handleProfileSubmit}
        isOrganizer={raffle?.isOwner}
        initialData={userProfile ? {
          ...userProfile,
          phone: userProfile.phone || undefined,
          about: userProfile.about || undefined,
          address_line1: userProfile.address_line1 || undefined,
          address_line2: userProfile.address_line2 || undefined,
          city: userProfile.city || undefined,
          region: userProfile.region || undefined,
          postal_code: userProfile.postal_code || undefined,
          country: userProfile.country || undefined,
          address_line1_en: userProfile.address_line1_en || undefined,
          address_line2_en: userProfile.address_line2_en || undefined,
          city_en: userProfile.city_en || undefined,
          region_en: userProfile.region_en || undefined,
          wishlist: userProfile.wishlist || undefined,
          anti_wishlist: userProfile.anti_wishlist || undefined,
        } : undefined}
      />

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
