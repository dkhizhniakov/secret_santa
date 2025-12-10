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
  Tooltip,
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
import { ExclusionsManager } from '../components/ExclusionsManager';
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

  const handleProfileDialogClose = () => {
    setProfileDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['raffle', id] });
    queryClient.invalidateQueries({ queryKey: ['profile'] }); // Обновляем кэш глобального профиля
    showSnackbar(t('raffleDetail.profileUpdated'));
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
        sx={{ mb: { xs: 2, sm: 3 } }}
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
      <Card sx={{ mb: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 2, sm: 3 }, 
            alignItems: 'flex-start', 
            mb: { xs: 2, sm: 3 },
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <Avatar 
              src={raffle.avatarUrl || undefined}
              sx={{ width: { xs: 64, sm: 80 }, height: { xs: 64, sm: 80 } }}
            >
              🎅
            </Avatar>
            <Box sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'start',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1
              }}>
                <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                  {raffle.name}
                </Typography>
                {raffle.isDrawn ? (
                  <Chip
                    icon={<CardGiftcard />}
                    label={t('dashboard.status.drawn')}
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip
                    label={t('dashboard.status.pending')}
                    color="warning"
                    size="small"
                  />
                )}
              </Box>

              {raffle.description && (
                <Typography color="text.secondary" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  {raffle.description}
                </Typography>
              )}

              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 2, sm: 3 }, 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
                {raffle.eventDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonth color="action" fontSize="small" />
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>{t('raffleDetail.eventDate')}:</strong> {formatDate(raffle.eventDate)}
                    </Typography>
                  </Box>
                )}
                {raffle.budget && (
                  <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
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
                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 1, sm: 2 }, 
                    flexWrap: 'wrap', 
                    mt: 2,
                    '& > button': {
                      flex: { xs: '1 1 calc(50% - 4px)', sm: '0 1 auto' },
                      minWidth: { xs: 0, sm: 'auto' }
                    }
                  }}>
                    <Button
                      variant="contained"
                      startIcon={<Shuffle sx={{ display: { xs: 'none', sm: 'block' } }} />}
                      onClick={() => drawMutation.mutate()}
                      disabled={
                        raffle.members.length < 3 || 
                        drawMutation.isPending || 
                        !raffle.members.every(m => m.isProfileFilled)
                      }
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      {drawMutation.isPending ? t('raffleDetail.drawing') : t('raffleDetail.drawButton')}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopy sx={{ display: { xs: 'none', sm: 'block' } }} />}
                      onClick={handleCopyInviteCode}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      {t('raffleDetail.copyCode')}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopy sx={{ display: { xs: 'none', sm: 'block' } }} />}
                      onClick={handleCopyInviteLink}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      {t('raffleDetail.copyLink')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete sx={{ display: { xs: 'none', sm: 'block' } }} />}
                      onClick={() => setDeleteDialogOpen(true)}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
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
        <Card sx={{ mb: { xs: 2, sm: 3 }, bgcolor: 'primary.main', color: 'white' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              🎁 {t('raffleDetail.yourGiftee')}:
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2, fontSize: { xs: '1.75rem', sm: '2rem' } }}>
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

      {/* Exclusions Manager (только для владельца до жеребьевки) */}
      {raffle.isOwner && !raffle.isDrawn && (
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <ExclusionsManager
            raffleId={id!}
            members={raffle.members}
            isOwner={raffle.isOwner}
          />
        </Box>
      )}

      {/* Members */}
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {t('raffleDetail.participants')} ({raffle.members.length})
          </Typography>
          <List sx={{ p: 0 }}>
            {raffle.members.map((member) => (
              <ListItem key={member.id} sx={{ px: { xs: 0, sm: 2 } }}>
                <ListItemAvatar>
                  <Avatar 
                    src={member.avatarUrl || undefined}
                    sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}
                  >
                    {member.name[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {member.name}
                      </Typography>
                      {member.isProfileFilled ? (
                        <Tooltip title={t('raffleDetail.profileFilled')} arrow>
                          <CheckCircle fontSize="small" sx={{ color: 'success.main' }} />
                        </Tooltip>
                      ) : (
                        <Tooltip title={t('raffleDetail.profileNotFilled')} arrow>
                          <Warning fontSize="small" sx={{ color: 'warning.main' }} />
                        </Tooltip>
                      )}
                    </Box>
                  }
                  secondary={member.userId === raffle.ownerId ? t('raffleDetail.organizer') : ''}
                  secondaryTypographyProps={{ sx: { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                />
              </ListItem>
            ))}
          </List>
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
      {id && (
        <ParticipantProfileDialog
          open={profileDialogOpen}
          onClose={handleProfileDialogClose}
          raffleId={id}
          isOrganizer={raffle?.isOwner}
          initialData={userProfile || undefined}
        />
      )}

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
