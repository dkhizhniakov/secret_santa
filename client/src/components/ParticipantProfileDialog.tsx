import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { matchIsValidTel } from "mui-tel-input";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from "@mui/material";
import { ProfileFormFields, ProfileFormData } from "./ProfileFormFields";
import * as api from "../services/api";
import {
  validatePhone,
  validatePostalCode,
  containsDangerousContent,
  MAX_ABOUT_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_CITY_LENGTH,
  MAX_REGION_LENGTH,
  MAX_WISHLIST_LENGTH,
} from "../utils/validator";

const getProfileSchema = (t: (key: string, params?: any) => string) =>
  z.object({
    phone: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => !val || matchIsValidTel(val),
        t("validation.invalidPhone")
      )
      .refine(
        (val) => !val || !validatePhone(val),
        t("validation.invalidPhone")
      ),
    about: z
      .string()
      .max(MAX_ABOUT_LENGTH, t("validation.maxChars", { count: MAX_ABOUT_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    address_line1: z
      .string()
      .max(MAX_ADDRESS_LENGTH, t("validation.maxChars", { count: MAX_ADDRESS_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    address_line2: z
      .string()
      .max(MAX_ADDRESS_LENGTH, t("validation.maxChars", { count: MAX_ADDRESS_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    city: z
      .string()
      .max(MAX_CITY_LENGTH, t("validation.maxChars", { count: MAX_CITY_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    region: z
      .string()
      .max(MAX_REGION_LENGTH, t("validation.maxChars", { count: MAX_REGION_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    postal_code: z
      .string()
      .max(20, t("validation.maxChars", { count: 20 }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !validatePostalCode(val),
        "Invalid postal code"
      ),
    country: z.string().optional().nullable(),
    address_line1_en: z
      .string()
      .max(MAX_ADDRESS_LENGTH, t("validation.maxChars", { count: MAX_ADDRESS_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    address_line2_en: z
      .string()
      .max(MAX_ADDRESS_LENGTH, t("validation.maxChars", { count: MAX_ADDRESS_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    city_en: z
      .string()
      .max(MAX_CITY_LENGTH, t("validation.maxChars", { count: MAX_CITY_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    region_en: z
      .string()
      .max(MAX_REGION_LENGTH, t("validation.maxChars", { count: MAX_REGION_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    wishlist: z
      .string()
      .max(MAX_WISHLIST_LENGTH, t("validation.maxChars", { count: MAX_WISHLIST_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
    anti_wishlist: z
      .string()
      .max(MAX_WISHLIST_LENGTH, t("validation.maxChars", { count: MAX_WISHLIST_LENGTH }))
      .optional()
      .nullable()
      .refine(
        (val) => !val || !containsDangerousContent(val),
        "Contains prohibited content"
      ),
  });

interface Props {
  open: boolean;
  onClose: () => void;
  raffleId: string;
  initialData?: Partial<ProfileFormData>;
  isOrganizer?: boolean;
}

export const ParticipantProfileDialog = ({
  open,
  onClose,
  raffleId,
  initialData,
  isOrganizer = false,
}: Props) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(getProfileSchema(t)),
    defaultValues: initialData || {},
  });

  useEffect(() => {
    if (open && initialData) {
      reset(initialData);
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: ProfileFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Сохраняем в глобальный профиль
      await api.updateProfile(data);

      // Сохраняем в профиль участника розыгрыша
      await api.updateMyRaffleProfile(raffleId, data);

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || t("profile.errorSaving"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={false}
      PaperProps={{
        sx: {
          m: { xs: 2, sm: 3 },
          width: { xs: "calc(100% - 32px)", sm: "100%" },
          maxHeight: { xs: "calc(100% - 32px)", sm: "90vh" },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: { xs: "1.125rem", sm: "1.25rem" },
          px: { xs: 2, sm: 3 },
        }}
      >
        {t("participantProfile.title")}
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        <Alert severity="info" sx={{ mb: { xs: 2, sm: 3 }, mt: 1 }}>
          <Typography
            variant="body2"
            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
          >
            {isOrganizer
              ? t("participantProfile.organizerSubtitle")
              : t("participantProfile.subtitle")}
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <ProfileFormFields
            control={control}
            errors={errors}
            register={register}
            setValue={setValue}
            watch={watch}
            showPrivacyNotice={false}
          />
        </form>
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          flexDirection: { xs: "column-reverse", sm: "row" },
          gap: { xs: 1, sm: 0 },
        }}
      >
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {t("participantProfile.skip")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isSubmitting}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {isSubmitting ? t("common.save") + "..." : t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
