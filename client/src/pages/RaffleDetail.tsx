import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Snackbar,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack,
  ContentCopy,
  Shuffle,
  Delete,
  CardGiftcard,
  CalendarMonth,
  CheckCircle,
  Warning,
  PersonRemove,
} from "@mui/icons-material";
import * as api from "../services/api";
import { ParticipantProfileDialog } from "../components/ParticipantProfileDialog";
import { ExclusionsManager } from "../components/ExclusionsManager";
import { AnonymousChat } from "../components/AnonymousChat";
import { ParticipantProfile } from "../types";

const RaffleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [chatHintOpen, setChatHintOpen] = useState(false);
  const [removeMemberDialog, setRemoveMemberDialog] = useState<{
    open: boolean;
    memberId: string | null;
    memberName: string;
  }>({ open: false, memberId: null, memberName: "" });

  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle", id],
    queryFn: () => api.getRaffle(id!),
    enabled: !!id,
  });

  const { data: assignment } = useQuery({
    queryKey: ["assignment", id],
    queryFn: () => api.getMyAssignment(id!),
    enabled: !!id && !!raffle?.isDrawn,
  });

  // Загрузить текущего пользователя
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
  });

  // Загружаем профиль участника из рафла (если пользователь является участником)
  const { data: memberProfile } = useQuery({
    queryKey: ["raffleProfile", id],
    queryFn: () => api.getMyRaffleProfile(id!),
    enabled: !!id && !!raffle && !!currentUser,
    retry: false,
  });

  const userProfileData: ParticipantProfile | undefined = memberProfile;

  const drawMutation = useMutation({
    mutationFn: () => api.drawNames(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raffle", id] });
      queryClient.invalidateQueries({ queryKey: ["assignment", id] });
      showSnackbar(t("raffleDetail.drawSuccess"));
      // Показываем подсказку о чате через 2 секунды после жеребьевки
      setTimeout(() => {
        setChatHintOpen(true);
      }, 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteRaffle(id!),
    onSuccess: () => {
      navigate("/");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.removeMember(id!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raffle", id] });
      queryClient.invalidateQueries({ queryKey: ["exclusions", id] });
      showSnackbar(t("raffleDetail.memberRemoved"));
      setRemoveMemberDialog({ open: false, memberId: null, memberName: "" });
    },
  });

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleCopyInviteCode = () => {
    if (raffle) {
      navigator.clipboard.writeText(raffle.inviteCode);
      showSnackbar(t("raffleDetail.codeCopied"));
    }
  };

  const handleCopyInviteLink = () => {
    if (raffle) {
      const url = `${window.location.origin}/join/${raffle.inviteCode}`;
      navigator.clipboard.writeText(url);
      showSnackbar(t("raffleDetail.linkCopied"));
    }
  };

  const handleProfileDialogClose = () => {
    setProfileDialogOpen(false);
    // Обновляем данные рафла и профиль участника
    queryClient.invalidateQueries({ queryKey: ["raffle", id] });
    queryClient.invalidateQueries({ queryKey: ["raffleProfile", id] });
    showSnackbar(t("raffleDetail.profileUpdated"));
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setRemoveMemberDialog({ open: true, memberId, memberName });
  };

  const confirmRemoveMember = () => {
    if (removeMemberDialog.memberId) {
      removeMemberMutation.mutate(removeMemberDialog.memberId);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return t("raffleDetail.notSpecified");
    return new Date(date).toLocaleDateString(i18n.language, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton
          variant="rectangular"
          height={300}
          sx={{ mb: 3, borderRadius: 2 }}
        />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!raffle) {
    return <Alert severity="error">{t("raffleDetail.notFound")}</Alert>;
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate("/")}
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        {t("common.back")}
      </Button>

      {/* Error Alert */}
      {drawMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(drawMutation.error as any).response?.data?.error ||
            t("raffleDetail.drawError")}
        </Alert>
      )}
      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(deleteMutation.error as any).response?.data?.error ||
            t("common.delete")}
        </Alert>
      )}
      {removeMemberMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(removeMemberMutation.error as any).response?.data?.error ||
            t("raffleDetail.removeMember")}
        </Alert>
      )}

      {/* Main Info */}
      <Card sx={{ mb: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Box
            sx={{
              display: "flex",
              gap: { xs: 2, sm: 3 },
              alignItems: "flex-start",
              mb: { xs: 2, sm: 3 },
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Avatar
              src={raffle.avatarUrl || undefined}
              sx={{ width: { xs: 64, sm: 80 }, height: { xs: 64, sm: 80 } }}
            >
              🎅
            </Avatar>
            <Box sx={{ flex: 1, width: { xs: "100%", sm: "auto" } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 1,
                }}
              >
                <Typography
                  variant="h4"
                  fontWeight={700}
                  gutterBottom
                  sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
                >
                  {raffle.name}
                </Typography>
                {raffle.isDrawn ? (
                  <Chip
                    icon={<CardGiftcard />}
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

              {raffle.description && (
                <Typography
                  color="text.secondary"
                  paragraph
                  sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  {raffle.description}
                </Typography>
              )}

              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 2, sm: 3 },
                  mb: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                {raffle.eventDate && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CalendarMonth color="action" fontSize="small" />
                    <Typography
                      sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                    >
                      <strong>{t("raffleDetail.eventDate")}:</strong>{" "}
                      {formatDate(raffle.eventDate)}
                    </Typography>
                  </Box>
                )}
                {raffle.budget && (
                  <Typography sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                    <strong>{t("raffleDetail.budget")}:</strong> {raffle.budget}
                  </Typography>
                )}
              </Box>

              {raffle.isOwner && currentUser && (
                <>
                  {/* До жеребьёвки */}
                  {!raffle.isDrawn && (
                    <>
                      {/* Проверка минимального количества участников */}
                      {raffle.members.length < 3 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          {t("raffleDetail.needMoreParticipants", {
                            current: raffle.members.length,
                            needed: 3,
                          })}
                        </Alert>
                      )}

                      {/* Проверка заполненности профилей */}
                      {raffle.members.length >= 3 &&
                        !raffle.members.every((m) => m.isProfileFilled) && (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            {t("raffleDetail.profilesNotFilled")}
                            {/* Если сам организатор не заполнил профиль */}
                            {raffle.members.find(
                              (m) => m.userId === currentUser.id
                            )?.isProfileFilled === false && (
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => setProfileDialogOpen(true)}
                                sx={{ ml: 2 }}
                              >
                                {t("raffleDetail.fillMyProfile")}
                              </Button>
                            )}
                          </Alert>
                        )}

                      {/* Сообщение что можно изменить профиль для организатора */}
                      {raffle.members.find((m) => m.userId === currentUser.id)
                        ?.isProfileFilled === true && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 1,
                            }}
                          >
                            <Typography variant="body2">
                              {t(
                                "raffleDetail.canEditProfile",
                                "Вы можете изменить свой профиль до проведения жеребьёвки."
                              )}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setProfileDialogOpen(true)}
                            >
                              {t(
                                "raffleDetail.editProfile",
                                "Изменить профиль"
                              )}
                            </Button>
                          </Box>
                        </Alert>
                      )}
                    </>
                  )}

                  {/* После жеребьёвки */}
                  {raffle.isDrawn && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 1,
                        }}
                      >
                        <Typography variant="body2">
                          {t(
                            "raffleDetail.canEditProfileAfterDraw",
                            "Вы можете обновить свой профиль (например, уточнить адрес) для вашего Тайного Санты."
                          )}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setProfileDialogOpen(true)}
                        >
                          {t("raffleDetail.editProfile", "Изменить профиль")}
                        </Button>
                      </Box>
                    </Alert>
                  )}

                  {/* Кнопки управления */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: { xs: 1, sm: 2 },
                      flexWrap: "wrap",
                      mt: 2,
                      "& > button": {
                        flex: { xs: "1 1 calc(50% - 4px)", sm: "0 1 auto" },
                        minWidth: { xs: 0, sm: "auto" },
                      },
                    }}
                  >
                    {!raffle.isDrawn && (
                      <Button
                        variant="contained"
                        startIcon={
                          <Shuffle
                            sx={{ display: { xs: "none", sm: "block" } }}
                          />
                        }
                        onClick={() => drawMutation.mutate()}
                        disabled={
                          raffle.members.length < 3 ||
                          drawMutation.isPending ||
                          !raffle.members.every((m) => m.isProfileFilled)
                        }
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        {drawMutation.isPending
                          ? t("raffleDetail.drawing")
                          : t("raffleDetail.drawButton")}
                      </Button>
                    )}
                    {!raffle.isDrawn && (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={
                            <ContentCopy
                              sx={{ display: { xs: "none", sm: "block" } }}
                            />
                          }
                          onClick={handleCopyInviteCode}
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          {t("raffleDetail.copyCode")}
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={
                            <ContentCopy
                              sx={{ display: { xs: "none", sm: "block" } }}
                            />
                          }
                          onClick={handleCopyInviteLink}
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          {t("raffleDetail.copyLink")}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={
                        <Delete sx={{ display: { xs: "none", sm: "block" } }} />
                      }
                      onClick={() => setDeleteDialogOpen(true)}
                      sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      {t("raffleDetail.deleteButton")}
                    </Button>
                  </Box>
                </>
              )}

              {!raffle.isOwner && currentUser && (
                <>
                  {/* До жеребьёвки */}
                  {raffle.isDrawn === false && (
                    <>
                      {raffle.members.find((m) => m.userId === currentUser.id)
                        ?.isProfileFilled === false ? (
                        <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            <Typography variant="body2">
                              {t("raffleDetail.yourProfileNotFilled")}
                            </Typography>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => setProfileDialogOpen(true)}
                              sx={{ alignSelf: "flex-start" }}
                            >
                              {t("raffleDetail.fillProfile")}
                            </Button>
                          </Box>
                        </Alert>
                      ) : (
                        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            <Typography variant="body2">
                              {t(
                                "raffleDetail.canEditProfile",
                                "Вы можете изменить свой профиль до проведения жеребьёвки."
                              )}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setProfileDialogOpen(true)}
                              sx={{ alignSelf: "flex-start" }}
                            >
                              {t(
                                "raffleDetail.editProfile",
                                "Изменить профиль"
                              )}
                            </Button>
                          </Box>
                        </Alert>
                      )}
                      <Alert severity="info" sx={{ mt: 2 }}>
                        {t("raffleDetail.notDrawnYet")}
                      </Alert>
                    </>
                  )}

                  {/* После жеребьёвки */}
                  {raffle.isDrawn === true && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <Typography variant="body2">
                          {t(
                            "raffleDetail.canEditProfileAfterDraw",
                            "Вы можете обновить свой профиль (например, уточнить адрес) для вашего Тайного Санты."
                          )}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setProfileDialogOpen(true)}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          {t("raffleDetail.editProfile", "Изменить профиль")}
                        </Button>
                      </Box>
                    </Alert>
                  )}
                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Assignment */}
      {raffle.isDrawn && assignment && (
        <Card
          sx={{ mb: { xs: 2, sm: 3 }, bgcolor: "primary.main", color: "white" }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              🎁 {t("raffleDetail.yourGiftee")}:
            </Typography>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ mb: 2, fontSize: { xs: "1.75rem", sm: "2rem" } }}
            >
              {assignment.receiverName}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(`/raffle/${id}/giftee`)}
            >
              {t("raffleDetail.viewGifteeProfile")}
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
      <Card sx={{ mb: raffle.isDrawn ? { xs: 2, sm: 3 } : 0 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, mb: 2 }}
          >
            {t("raffleDetail.participants")} ({raffle.members.length})
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            {raffle.members.map((member) => (
              <Box
                key={member.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "background.default",
                  minWidth: { xs: "100%", sm: "calc(50% - 8px)", md: "auto" },
                }}
              >
                <Avatar
                  src={member.avatarUrl || undefined}
                  sx={{
                    width: 40,
                    height: 40,
                  }}
                >
                  {member.name[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      {member.name}
                    </Typography>
                    {member.isProfileFilled ? (
                      <Tooltip title={t("raffleDetail.profileFilled")} arrow>
                        <CheckCircle
                          fontSize="small"
                          sx={{ color: "success.main" }}
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title={t("raffleDetail.profileNotFilled")} arrow>
                        <Warning
                          fontSize="small"
                          sx={{ color: "warning.main" }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                  {member.userId === raffle.ownerId && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      {t("raffleDetail.organizer")}
                    </Typography>
                  )}
                </Box>
                {raffle.isOwner &&
                  !raffle.isDrawn &&
                  member.userId !== raffle.ownerId && (
                    <Tooltip title={t("raffleDetail.removeMember")} arrow>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        sx={{
                          minWidth: "auto",
                          p: 0.5,
                        }}
                      >
                        <PersonRemove fontSize="small" />
                      </Button>
                    </Tooltip>
                  )}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Плавающий чат */}
      {raffle.isDrawn && currentUser && (
        <AnonymousChat
          raffleId={id!}
          memberId={
            raffle.members.find((m) => m.userId === currentUser.id)?.id || ""
          }
        />
      )}

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{t("raffleDetail.deleteConfirmTitle")}</DialogTitle>
        <DialogContent>{t("raffleDetail.deleteConfirmText")}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setDeleteDialogOpen(false);
              deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? t("raffleDetail.deleting")
              : t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog
        open={removeMemberDialog.open}
        onClose={() =>
          setRemoveMemberDialog({ open: false, memberId: null, memberName: "" })
        }
      >
        <DialogTitle>{t("raffleDetail.removeMemberTitle")}</DialogTitle>
        <DialogContent>
          {t("raffleDetail.removeMemberText", {
            name: removeMemberDialog.memberName,
          })}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setRemoveMemberDialog({
                open: false,
                memberId: null,
                memberName: "",
              })
            }
          >
            {t("common.cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmRemoveMember}
            disabled={removeMemberMutation.isPending}
          >
            {removeMemberMutation.isPending
              ? t("raffleDetail.removing")
              : t("raffleDetail.removeMember")}
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
          initialData={userProfileData}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      {/* Подсказка о чате после жеребьевки */}
      <Snackbar
        open={chatHintOpen}
        autoHideDuration={8000}
        onClose={() => setChatHintOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ mb: 10, mr: { xs: 0, sm: 2 } }}
      >
        <Alert
          onClose={() => setChatHintOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          💬{" "}
          {t(
            "raffleDetail.chatHint",
            "Now you can chat anonymously! Click the chat button in the bottom right corner."
          )}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RaffleDetail;
