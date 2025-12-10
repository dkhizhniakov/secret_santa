import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  matchIsValidTel,
  MuiTelInputCountry,
} from "mui-tel-input";
import { getProfile, updateProfile } from "../services/api";
import {
  ProfileFormFields,
  ProfileFormData,
} from "../components/ProfileFormFields";

const getProfileSchema = (t: (key: string, params?: any) => string) =>
  z.object({
    phone: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => !val || matchIsValidTel(val),
        t("validation.invalidPhone")
      ),
    about: z
      .string()
      .max(1000, t("validation.maxChars", { count: 1000 }))
      .optional()
      .nullable(),
    address_line1: z
      .string()
      .max(200, t("validation.maxChars", { count: 200 }))
      .optional()
      .nullable(),
    address_line2: z
      .string()
      .max(200, t("validation.maxChars", { count: 200 }))
      .optional()
      .nullable(),
    city: z
      .string()
      .max(100, t("validation.maxChars", { count: 100 }))
      .optional()
      .nullable(),
    region: z
      .string()
      .max(100, t("validation.maxChars", { count: 100 }))
      .optional()
      .nullable(),
    postal_code: z
      .string()
      .max(20, t("validation.maxChars", { count: 20 }))
      .optional()
      .nullable(),
    country: z.string().optional().nullable(),
    address_line1_en: z
      .string()
      .max(200, t("validation.maxChars", { count: 200 }))
      .optional()
      .nullable(),
    address_line2_en: z
      .string()
      .max(200, t("validation.maxChars", { count: 200 }))
      .optional()
      .nullable(),
    city_en: z
      .string()
      .max(100, t("validation.maxChars", { count: 100 }))
      .optional()
      .nullable(),
    region_en: z
      .string()
      .max(100, t("validation.maxChars", { count: 100 }))
      .optional()
      .nullable(),
    wishlist: z
      .string()
      .max(2000, t("validation.maxChars", { count: 2000 }))
      .optional()
      .nullable(),
    anti_wishlist: z
      .string()
      .max(1000, t("validation.maxChars", { count: 1000 }))
      .optional()
      .nullable(),
  });

export default function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [detectedCountry, setDetectedCountry] =
    useState<MuiTelInputCountry>("RU");

  // Определяем страну по геолокации/IP
  useEffect(() => {
    // Пробуем определить по временной зоне браузера
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Простое определение по часовому поясу
    if (
      timezone.includes("Europe/Moscow") ||
      timezone.includes("Asia/Yekaterinburg")
    ) {
      setDetectedCountry("RU");
    } else if (
      timezone.includes("Europe/Madrid") ||
      timezone.includes("Atlantic/Canary")
    ) {
      setDetectedCountry("ES");
    } else if (timezone.includes("Asia/Yerevan")) {
      setDetectedCountry("AM");
    } else {
      // Запасной вариант - определение по языку браузера
      const lang = navigator.language.toLowerCase();
      if (lang.includes("ru")) setDetectedCountry("RU");
      else if (lang.includes("es")) setDetectedCountry("ES");
      else if (lang.includes("hy")) setDetectedCountry("AM");
    }
  }, []);

  // Загрузка профиля
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  // Мутация для обновления профиля
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      // Показываем успех и возвращаемся на дашборд
      setTimeout(() => {
        navigate("/");
      }, 1500);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(getProfileSchema(t)),
    defaultValues: {
      phone: "",
      about: "",
      address_line1: "",
      address_line2: "",
      city: "",
      region: "",
      postal_code: "",
      country: "",
      address_line1_en: "",
      address_line2_en: "",
      city_en: "",
      region_en: "",
      wishlist: "",
      anti_wishlist: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        phone: profile.phone || "",
        about: profile.about || "",
        address_line1: profile.address_line1 || "",
        address_line2: profile.address_line2 || "",
        city: profile.city || "",
        region: profile.region || "",
        postal_code: profile.postal_code || "",
        country: profile.country || detectedCountry,
        address_line1_en: profile.address_line1_en || "",
        address_line2_en: profile.address_line2_en || "",
        city_en: profile.city_en || "",
        region_en: profile.region_en || "",
        wishlist: profile.wishlist || "",
        anti_wishlist: profile.anti_wishlist || "",
      });
    } else {
      setValue("country", detectedCountry);
    }
  }, [profile, reset, detectedCountry, setValue]);

  const onSubmit = (data: ProfileFormData) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{t("profile.errorLoading")}</Alert>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="md"
      sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}
    >
      <Paper sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ mb: 2, fontSize: { xs: "1.5rem", sm: "2rem" } }}
        >
          👤 {t("profile.title")}
        </Typography>

        {mutation.isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t("profile.successSaved")}
          </Alert>
        )}

        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t("profile.errorSaving")}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <ProfileFormFields
            control={control}
            errors={errors}
            register={register}
            setValue={setValue}
            watch={watch}
            detectedCountry={detectedCountry}
            showPrivacyNotice={true}
          />

          {/* Кнопки */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: { xs: "stretch", sm: "flex-end" },
              flexDirection: { xs: "column", sm: "row" },
              mt: 2,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => navigate("/")}
              disabled={mutation.isPending}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {t("profile.cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={
                mutation.isPending ? (
                  <CircularProgress size={20} />
                ) : (
                  <SaveIcon />
                )
              }
              disabled={mutation.isPending || !isDirty}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {t("profile.save")}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
