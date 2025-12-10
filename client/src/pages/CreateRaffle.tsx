import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  MenuItem,
  Avatar,
  IconButton,
} from "@mui/material";
import { ArrowBack, PhotoCamera, Delete } from "@mui/icons-material";
import * as api from "../services/api";
import { ParticipantProfileDialog } from "../components/ParticipantProfileDialog";
import { ParticipantProfile } from "../types";

// Schema validation
const getCreateRaffleSchema = (t: (key: string, params?: any) => string) =>
  z.object({
    name: z.string().min(1, t("validation.required")).max(100, t("validation.maxChars", { count: 100 })),
    description: z.string().max(500, t("validation.maxChars", { count: 500 })).optional(),
    budgetMin: z.number().min(0, t("validation.minValue", { min: 0 })).optional(),
    budgetMax: z.number().min(0, t("validation.minValue", { min: 0 })).optional(),
    currency: z.enum(["RUB", "USD", "EUR"]),
    eventDate: z.string().min(1, t("validation.required")),
  }).refine(
    (data) => {
      if (data.budgetMin && data.budgetMax) {
        return data.budgetMin <= data.budgetMax;
      }
      return true;
    },
    {
      message: t("validation.budgetMinMax"),
      path: ["budgetMax"],
    }
  );

type CreateRaffleForm = z.infer<ReturnType<typeof getCreateRaffleSchema>>;

// Дефолтная дата - 31 декабря текущего года
const getDefaultEventDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  return `${year}-12-31`;
};

const CreateRaffle = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [createdRaffleId, setCreatedRaffleId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<ParticipantProfile | null>(null);

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: { errors },
  } = useForm<CreateRaffleForm>({
    resolver: zodResolver(getCreateRaffleSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      budgetMin: undefined,
      budgetMax: undefined,
      currency: "RUB",
      eventDate: getDefaultEventDate(),
    },
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

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
  });

  const createRaffleMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.createRaffle>[0]) => api.createRaffle(data),
    onSuccess: (raffle) => {
      // Показать диалог профиля организатору
      setCreatedRaffleId(raffle.id);
      setProfileDialogOpen(true);
    },
    onError: (error: any) => {
      setFormError("root", {
        message: error.response?.data?.error || t("createRaffle.errorCreate"),
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ raffleId, profile }: { raffleId: string; profile: ParticipantProfile }) =>
      api.updateMyRaffleProfile(raffleId, profile),
    onSuccess: () => {
      if (createdRaffleId) {
        navigate(`/raffle/${createdRaffleId}`);
      }
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarDelete = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleProfileSubmit = async (data: ParticipantProfile) => {
    if (createdRaffleId) {
      await updateProfileMutation.mutateAsync({ raffleId: createdRaffleId, profile: data });
    }
  };

  const handleProfileDialogClose = () => {
    setProfileDialogOpen(false);
    if (createdRaffleId) {
      navigate(`/raffle/${createdRaffleId}`);
    }
  };

  const onSubmit = async (data: CreateRaffleForm) => {
    try {
      // Загружаем аватар если есть
      let avatarUrl: string | undefined;
      if (avatarFile) {
        const uploadResult = await uploadAvatarMutation.mutateAsync(avatarFile);
        avatarUrl = uploadResult.url;
      }

      // Формируем бюджет
      let budget = "";
      if (data.budgetMin && data.budgetMax) {
        budget = `${data.budgetMin}-${data.budgetMax} ${data.currency}`;
      } else if (data.budgetMin) {
        budget = `от ${data.budgetMin} ${data.currency}`;
      } else if (data.budgetMax) {
        budget = `до ${data.budgetMax} ${data.currency}`;
      }
      
      createRaffleMutation.mutate({
        name: data.name,
        description: data.description,
        avatarUrl,
        budget,
        eventDate: data.eventDate,
      });
    } catch (error: any) {
      setFormError("root", {
        message: error.response?.data?.error || t("createRaffle.errorUploadAvatar"),
      });
    }
  };

  const isSubmitting = uploadAvatarMutation.isPending || createRaffleMutation.isPending;

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate("/")}
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        {t("common.back")}
      </Button>

      <Card sx={{ maxWidth: 600, mx: "auto" }}>
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            🎁 {t("createRaffle.title")}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: { xs: 3, sm: 4 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {t("createRaffle.subtitle")}
          </Typography>

          {errors.root && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.root.message}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Аватар */}
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: { xs: 1.5, sm: 2 }, 
              mb: { xs: 2, sm: 3 },
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <Avatar
                src={avatarPreview || undefined}
                sx={{ width: { xs: 64, sm: 80 }, height: { xs: 64, sm: 80 } }}
              >
                🎅
              </Avatar>
              <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="avatar-upload"
                  type="file"
                  onChange={handleAvatarChange}
                />
                <label htmlFor="avatar-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCamera />}
                    size="small"
                  >
                    {t("createRaffle.uploadAvatar")}
                  </Button>
                </label>
                {avatarPreview && (
                  <IconButton
                    size="small"
                    onClick={handleAvatarDelete}
                    sx={{ ml: 1 }}
                  >
                    <Delete />
                  </IconButton>
                )}
                <Typography variant="caption" display="block" color="text.secondary">
                  {t("common.optional")}
                </Typography>
              </Box>
            </Box>

            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={t("createRaffle.nameLabel")}
                  placeholder={t("createRaffle.namePlaceholder")}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={t("createRaffle.descriptionLabel")}
                  multiline
                  rows={3}
                  placeholder={t("createRaffle.descriptionPlaceholder")}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {t("createRaffle.budgetSection")}
            </Typography>

            <Box sx={{ 
              display: "flex", 
              gap: 2, 
              mb: 3,
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <Controller
                name="budgetMin"
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t("createRaffle.budgetFrom")}
                    type="number"
                    value={value ?? ""}
                    onChange={(e) =>
                      onChange(e.target.value ? Number(e.target.value) : undefined)
                    }
                    error={!!errors.budgetMin}
                    helperText={errors.budgetMin?.message}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                )}
              />

              <Controller
                name="budgetMax"
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t("createRaffle.budgetTo")}
                    type="number"
                    value={value ?? ""}
                    onChange={(e) =>
                      onChange(e.target.value ? Number(e.target.value) : undefined)
                    }
                    error={!!errors.budgetMax}
                    helperText={errors.budgetMax?.message}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                )}
              />

              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label={t("createRaffle.currency")}
                    error={!!errors.currency}
                    helperText={errors.currency?.message}
                    sx={{ minWidth: { xs: '100%', sm: 120 }, width: { xs: '100%', sm: 'auto' } }}
                  >
                    <MenuItem value="RUB">₽ RUB</MenuItem>
                    <MenuItem value="USD">$ USD</MenuItem>
                    <MenuItem value="EUR">€ EUR</MenuItem>
                  </TextField>
                )}
              />
            </Box>

            <Controller
              name="eventDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={t("createRaffle.eventDateLabel")}
                  type="date"
                  error={!!errors.eventDate}
                  helperText={errors.eventDate?.message}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("createRaffle.creating") : t("createRaffle.create")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Participant Profile Dialog */}
      <ParticipantProfileDialog
        open={profileDialogOpen}
        onClose={handleProfileDialogClose}
        onSubmit={handleProfileSubmit}
        isOrganizer={true}
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
    </Box>
  );
};

export default CreateRaffle;
