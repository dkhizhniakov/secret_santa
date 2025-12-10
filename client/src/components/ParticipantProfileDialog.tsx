import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box,
  Autocomplete,
} from "@mui/material";
import { MuiTelInput } from "mui-tel-input";
import { getCountries } from "libphonenumber-js";
import * as CountryFlagIcons from "country-flag-icons/react/3x2";
import transliterate from "@sindresorhus/transliterate";

const getProfileSchema = (t: (key: string, params?: any) => string) =>
  z.object({
    phone: z.string().optional(),
    about: z
      .string()
      .max(500, t("validation.maxChars", { count: 500 }))
      .optional(),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    address_line1_en: z.string().optional(),
    address_line2_en: z.string().optional(),
    city_en: z.string().optional(),
    region_en: z.string().optional(),
    wishlist: z.string().optional(),
    anti_wishlist: z.string().optional(),
  });

type ProfileForm = z.infer<ReturnType<typeof getProfileSchema>>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProfileForm) => Promise<void>;
  initialData?: Partial<ProfileForm>;
  isOrganizer?: boolean;
}

export const ParticipantProfileDialog = ({
  open,
  onClose,
  onSubmit,
  initialData,
  isOrganizer = false,
}: Props) => {
  const { t, i18n } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(getProfileSchema(t)),
    defaultValues: initialData || {},
  });

  useEffect(() => {
    if (open && initialData) {
      reset(initialData);
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: ProfileForm) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || t("profile.errorSaving"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addressLine1 = watch("address_line1");
  const addressLine2 = watch("address_line2");
  const city = watch("city");
  const region = watch("region");

  // Транслитерация адреса
  useEffect(() => {
    if (addressLine1) {
      setValue("address_line1_en", transliterate(addressLine1));
    }
  }, [addressLine1, setValue]);

  useEffect(() => {
    if (addressLine2) {
      setValue("address_line2_en", transliterate(addressLine2));
    }
  }, [addressLine2, setValue]);

  useEffect(() => {
    if (city) {
      setValue("city_en", transliterate(city));
    }
  }, [city, setValue]);

  useEffect(() => {
    if (region) {
      setValue("region_en", transliterate(region));
    }
  }, [region, setValue]);

  const getCountryName = (countryCode: string, lang: string = "ru"): string => {
    try {
      const regionNames = new Intl.DisplayNames([lang], { type: "region" });
      return regionNames.of(countryCode) || countryCode;
    } catch {
      return countryCode;
    }
  };

  const getCountryFlag = (countryCode: string) => {
    const FlagComponent = (CountryFlagIcons as any)[countryCode];
    return FlagComponent ? (
      <FlagComponent
        style={{ width: "24px", height: "16px", borderRadius: "2px" }}
      />
    ) : (
      <Box
        sx={{
          width: "24px",
          height: "16px",
          bgcolor: "grey.300",
          borderRadius: "2px",
        }}
      />
    );
  };

  const ALL_COUNTRIES = getCountries().map((code) => ({
    code,
    name: getCountryName(code, i18n.language),
  }));

  const PREFERRED_COUNTRIES = ["ES", "RU", "AM"];

  const SORTED_COUNTRIES = [
    ...ALL_COUNTRIES.filter((c) => PREFERRED_COUNTRIES.includes(c.code)),
    ...ALL_COUNTRIES.filter((c) => !PREFERRED_COUNTRIES.includes(c.code)).sort(
      (a, b) => a.name.localeCompare(b.name, i18n.language)
    ),
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t("participantProfile.title")}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3, mt: 1 }}>
          <Typography variant="body2">
            {isOrganizer 
              ? t("participantProfile.organizerSubtitle")
              : t("participantProfile.subtitle")
            }
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Телефон */}
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <MuiTelInput
                  {...field}
                  value={field.value || ""}
                  defaultCountry="RU"
                  preferredCountries={["ES", "RU", "AM"]}
                  langOfCountryName={i18n.language}
                  getFlagElement={(countryCode) => {
                    const FlagComponent = (CountryFlagIcons as any)[countryCode];
                    return FlagComponent ? (
                      <FlagComponent
                        style={{
                          width: "24px",
                          height: "16px",
                          borderRadius: "2px",
                        }}
                      />
                    ) : (
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          width: "24px",
                          height: "16px",
                          bgcolor: "grey.300",
                          borderRadius: "2px",
                        }}
                      />
                    );
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                  fullWidth
                  label={t("profile.phone")}
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                />
              )}
            />

            {/* О себе */}
            <Controller
              name="about"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ""}
                  fullWidth
                  multiline
                  rows={2}
                  label={t("profile.about")}
                  placeholder={t("profile.aboutPlaceholder")}
                  error={!!errors.about}
                  helperText={errors.about?.message}
                />
              )}
            />

            {/* Адрес */}
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              📦 {t("profile.addressSection")}
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              {t("profile.addressAutoInfo")}
            </Alert>

            {/* Страна */}
            <Controller
              name="country"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <Autocomplete
                  {...field}
                  value={SORTED_COUNTRIES.find((c) => c.code === value) || null}
                  onChange={(_, newValue) => onChange(newValue?.code || "")}
                  options={SORTED_COUNTRIES}
                  getOptionLabel={(option) => option.name}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props as any;
                    return (
                      <li {...otherProps} key={option.code}>
                        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                          {getCountryFlag(option.code)}
                          <span>{option.name}</span>
                        </Box>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("profile.country")}
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              {value && (
                                <Box sx={{ display: "flex", mr: 1 }}>
                                  {getCountryFlag(value)}
                                </Box>
                              )}
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  )}
                />
              )}
            />

            {/* Адрес строка 1 */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 100%" }}>
                <Controller
                  name="address_line1"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      fullWidth
                      label={t("profile.addressLine1")}
                      placeholder={t("profile.addressLine1Placeholder")}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: "1 1 100%" }}>
                <Controller
                  name="address_line1_en"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      fullWidth
                      label={t("profile.addressLine1En")}
                      placeholder={t("profile.addressLine1EnPlaceholder")}
                      autoComplete="nope"
                      slotProps={{
                        htmlInput: {
                          autoComplete: "chrome-off",
                          "data-form-type": "other",
                        },
                        input: {
                          sx: { bgcolor: "action.hover" },
                        },
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      helperText={t("profile.autoFilled")}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Адрес строка 2 */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 100%" }}>
                <Controller
                  name="address_line2"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      fullWidth
                      label={t("profile.addressLine2")}
                      placeholder={t("profile.addressLine2Placeholder")}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: "1 1 100%" }}>
                <Controller
                  name="address_line2_en"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      fullWidth
                      label={t("profile.addressLine2En")}
                      placeholder={t("profile.addressLine2EnPlaceholder")}
                      autoComplete="nope"
                      slotProps={{
                        htmlInput: {
                          autoComplete: "chrome-off",
                          "data-form-type": "other",
                        },
                        input: {
                          sx: { bgcolor: "action.hover" },
                        },
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      helperText={t("profile.autoFilled")}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Город */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 100%" }}>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      fullWidth
                      label={t("profile.city")}
                      placeholder={t("profile.cityPlaceholder")}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: "1 1 100%" }}>
                <Controller
                  name="city_en"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      fullWidth
                      label={t("profile.cityEn")}
                      placeholder={t("profile.cityEnPlaceholder")}
                      autoComplete="nope"
                      slotProps={{
                        htmlInput: {
                          autoComplete: "chrome-off",
                          "data-form-type": "other",
                        },
                        input: {
                          sx: { bgcolor: "action.hover" },
                        },
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      helperText={t("profile.autoFilled")}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Регион/Область */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 100%" }}>
                <Controller
                  name="region"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      fullWidth
                      label={t("profile.region")}
                      placeholder={t("profile.regionPlaceholder")}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: "1 1 100%" }}>
                <Controller
                  name="region_en"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ""}
                      fullWidth
                      label={t("profile.regionEn")}
                      placeholder={t("profile.regionEnPlaceholder")}
                      autoComplete="nope"
                      slotProps={{
                        htmlInput: {
                          autoComplete: "chrome-off",
                          "data-form-type": "other",
                        },
                        input: {
                          sx: { bgcolor: "action.hover" },
                        },
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      helperText={t("profile.autoFilled")}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Почтовый индекс */}
            <Controller
              name="postal_code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ""}
                  fullWidth
                  label={t("profile.postalCode")}
                  placeholder={t("profile.postalCodePlaceholder")}
                />
              )}
            />

            {/* Wishlist */}
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              🎁 {t("profile.wishlistSection")}
            </Typography>

            <Controller
              name="wishlist"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ""}
                  fullWidth
                  multiline
                  rows={3}
                  label={t("profile.wishlist")}
                  placeholder={t("profile.wishlistPlaceholder")}
                />
              )}
            />

            <Controller
              name="anti_wishlist"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ""}
                  fullWidth
                  multiline
                  rows={2}
                  label={t("profile.antiWishlist")}
                  placeholder={t("profile.antiWishlistPlaceholder")}
                />
              )}
            />
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          {t("participantProfile.skip")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? t("common.save") + "..." : t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
