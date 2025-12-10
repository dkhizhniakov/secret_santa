import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
} from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  MuiTelInput,
  matchIsValidTel,
  MuiTelInputCountry,
} from "mui-tel-input";
import { getCountries } from "libphonenumber-js";
import * as flags from "country-flag-icons/react/3x2";
import { getProfile, updateProfile } from "../services/api";
import transliterate from "@sindresorhus/transliterate";

// Zod схема для валидации (создается внутри компонента для доступа к t)
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

    // Адрес на местном языке
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

    // Адрес на английском (автозаполняемый)
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
      .max(2000, t("validation.maxChars", { count: 2000 }))
      .optional()
      .nullable(),
  });

type ProfileFormData = z.infer<ReturnType<typeof getProfileSchema>>;

// Получаем название страны на местном языке
const getCountryName = (countryCode: string, lang: string = "ru"): string => {
  try {
    const regionNames = new Intl.DisplayNames([lang], { type: "region" });
    return regionNames.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
};

// Получаем компонент флага страны из библиотеки
const getCountryFlag = (countryCode: string) => {
  const FlagComponent = (flags as any)[countryCode];
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

// Список всех стран с флагами
const ALL_COUNTRIES = getCountries().map((code) => ({
  code,
  name: getCountryName(code, "ru"),
  flag: getCountryFlag(code),
}));

// Приоритетные страны
const PREFERRED_COUNTRIES = ["ES", "RU", "AM"];

// Сортируем: сначала приоритетные, потом остальные по алфавиту
const SORTED_COUNTRIES = [
  ...ALL_COUNTRIES.filter((c) => PREFERRED_COUNTRIES.includes(c.code)),
  ...ALL_COUNTRIES.filter((c) => !PREFERRED_COUNTRIES.includes(c.code)).sort(
    (a, b) => a.name.localeCompare(b.name, "ru")
  ),
];

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

  // Настройка формы
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
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

  // Заполняем форму при загрузке данных
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
      // Если профиля нет, устанавливаем страну по умолчанию
      setValue("country", detectedCountry);
    }
  }, [profile, reset, detectedCountry, setValue]);

  // Автозаполнение английской версии адреса
  const addressLine1 = useWatch({ control, name: "address_line1" });
  const addressLine2 = useWatch({ control, name: "address_line2" });
  const city = useWatch({ control, name: "city" });
  const region = useWatch({ control, name: "region" });
  const selectedCountry = useWatch({ control, name: "country" });
  const [lastPhoneCountry, setLastPhoneCountry] = useState<string | null>(null);

  // Синхронизация страны из телефона в адрес
  const handlePhoneChange = (_value: string, info: any) => {
    if (info.countryCode && info.countryCode !== selectedCountry) {
      setValue("country", info.countryCode, { shouldDirty: true });
      setLastPhoneCountry(info.countryCode);
    }
  };

  // Синхронизация страны из адреса в телефон (только если телефон пустой или страна совпадала)
  useEffect(() => {
    const phoneValue = control._formValues.phone;
    if (selectedCountry && (!phoneValue || lastPhoneCountry === selectedCountry)) {
      // Обновляем defaultCountry через ref, но это не сработает для уже открытого поля
      // Поэтому просто запоминаем для следующего открытия
      setLastPhoneCountry(selectedCountry);
    }
  }, [selectedCountry, control._formValues.phone, lastPhoneCountry]);

  // Функция для транслитерации при потере фокуса (для autocomplete)
  const handleTransliterate = (
    sourceField: keyof ProfileFormData,
    targetField: keyof ProfileFormData
  ) => {
    return () => {
      const value = control._formValues[sourceField];
      if (value && typeof value === "string") {
        setValue(targetField, transliterate(value), { shouldDirty: true });
      }
    };
  };

  // Автотранслитерация при вводе (useWatch)
  useEffect(() => {
    if (addressLine1) {
      setValue("address_line1_en", transliterate(addressLine1), {
        shouldDirty: true,
      });
    }
  }, [addressLine1, setValue]);

  useEffect(() => {
    if (addressLine2) {
      setValue("address_line2_en", transliterate(addressLine2), {
        shouldDirty: true,
      });
    }
  }, [addressLine2, setValue]);

  useEffect(() => {
    if (city) {
      setValue("city_en", transliterate(city), { shouldDirty: true });
    }
  }, [city, setValue]);

  useEffect(() => {
    if (region) {
      setValue("region_en", transliterate(region), { shouldDirty: true });
    }
  }, [region, setValue]);

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
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      <Paper sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          👤 {t("profile.title")}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          {t("profile.subtitle")}
        </Typography>

        {mutation.isSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {t("profile.successSaved")}
          </Alert>
        )}

        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {t("profile.errorSaving")}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Alert severity="info" icon="🔒">
              <span dangerouslySetInnerHTML={{ __html: t("profile.privacyNotice") }} />
            </Alert>

            {/* Телефон */}
            <Controller
              name="phone"
              control={control}
              render={({ field, fieldState }) => (
                <MuiTelInput
                  {...field}
                  value={field.value || ""}
                  onChange={(value, info) => {
                    field.onChange(value);
                    handlePhoneChange(value, info);
                  }}
                  label={t("profile.phone")}
                  defaultCountry={detectedCountry}
                  preferredCountries={["ES", "RU", "AM"]}
                  langOfCountryName="ru"
                  getFlagElement={(countryCode) => {
                    const FlagComponent = (flags as any)[countryCode];
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
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />

            {/* О себе */}
            <TextField
              label={t("profile.about")}
              placeholder={t("profile.aboutPlaceholder")}
              fullWidth
              multiline
              rows={3}
              {...register("about")}
              error={!!errors.about}
              helperText={errors.about?.message}
            />

            <Divider sx={{ my: 2 }}>
              <Typography variant="h6" color="text.secondary">
                📦 {t("profile.addressSection")}
              </Typography>
            </Divider>

            <Alert severity="info" sx={{ mb: 1 }}>
              {t("profile.addressAutoInfo")}
            </Alert>

            {/* Страна */}
            <Box sx={{ position: "relative" }}>
              {/* Скрытое поле для автозаполнения браузером */}
              <input
                type="text"
                autoComplete="country-name"
                style={{
                  position: "absolute",
                  opacity: 0,
                  height: 0,
                  width: 0,
                  pointerEvents: "none",
                }}
                onChange={(e) => {
                  if (e.target.value) {
                    // Ищем страну по названию
                    const country = SORTED_COUNTRIES.find(
                      (c) =>
                        c.name.toLowerCase() === e.target.value.toLowerCase() ||
                        c.code === e.target.value
                    );
                    if (country) {
                      setValue("country", country.code, { shouldDirty: true });
                      setLastPhoneCountry(country.code);
                      // Обновляем телефон если он пустой
                      if (!control._formValues.phone) {
                        setDetectedCountry(country.code as MuiTelInputCountry);
                      }
                    }
                  }
                }}
              />
              <Controller
                name="country"
                control={control}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    {...field}
                    options={SORTED_COUNTRIES}
                    getOptionLabel={(option) =>
                      typeof option === "string"
                        ? SORTED_COUNTRIES.find((c) => c.code === option)?.name ||
                          option
                        : option.name
                    }
                    value={
                      SORTED_COUNTRIES.find((c) => c.code === field.value) || null
                    }
                    onChange={(_, newValue) => {
                      const newCode = newValue?.code || "";
                      field.onChange(newCode);
                      // Обновляем страну для телефона если телефон пустой
                      if (newCode && !control._formValues.phone) {
                        setDetectedCountry(newCode as MuiTelInputCountry);
                      }
                      setLastPhoneCountry(newCode);
                    }}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props as any;
                      return (
                        <li {...otherProps} key={option.code}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.5,
                              alignItems: "center",
                            }}
                          >
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
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        slotProps={{
                          input: {
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                {field.value && (
                                  <Box sx={{ display: "flex", mr: 1 }}>
                                    {getCountryFlag(field.value)}
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
            </Box>

            {/* Адрес строка 1 */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box sx={{ flex: "1 1 100%", minWidth: { xs: '100%', sm: '250px' } }}>
                <TextField
                  label={t("profile.addressLine1")}
                  placeholder={t("profile.addressLine1Placeholder")}
                  fullWidth
                  {...register("address_line1")}
                  onBlur={handleTransliterate(
                    "address_line1",
                    "address_line1_en"
                  )}
                  error={!!errors.address_line1}
                  helperText={errors.address_line1?.message}
                />
              </Box>

              <Box sx={{ flex: "1 1 100%", minWidth: { xs: '100%', sm: '250px' } }}>
                <TextField
                  label={t("profile.addressLine1En")}
                  placeholder={t("profile.addressLine1EnPlaceholder")}
                  fullWidth
                  {...register("address_line1_en")}
                  autoComplete="nope"
                  error={!!errors.address_line1_en}
                  helperText={
                    errors.address_line1_en?.message || t("profile.autoFilled")
                  }
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
                />
              </Box>
            </Box>

            {/* Адрес строка 2 */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box sx={{ flex: "1 1 100%", minWidth: { xs: '100%', sm: '250px' } }}>
                <TextField
                  label={t("profile.addressLine2")}
                  placeholder={t("profile.addressLine2Placeholder")}
                  fullWidth
                  {...register("address_line2")}
                  onBlur={handleTransliterate(
                    "address_line2",
                    "address_line2_en"
                  )}
                  error={!!errors.address_line2}
                  helperText={errors.address_line2?.message}
                />
              </Box>

              <Box sx={{ flex: "1 1 100%", minWidth: { xs: '100%', sm: '250px' } }}>
                <TextField
                  label={t("profile.addressLine2En")}
                  placeholder={t("profile.addressLine2EnPlaceholder")}
                  fullWidth
                  {...register("address_line2_en")}
                  autoComplete="nope"
                  error={!!errors.address_line2_en}
                  helperText={
                    errors.address_line2_en?.message || t("profile.autoFilled")
                  }
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
                />
              </Box>
            </Box>

            {/* Город */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box sx={{ flex: "1 1 100%", minWidth: { xs: '100%', sm: '250px' } }}>
                <TextField
                  label={t("profile.city")}
                  placeholder={t("profile.cityPlaceholder")}
                  fullWidth
                  {...register("city")}
                  onBlur={handleTransliterate("city", "city_en")}
                  error={!!errors.city}
                  helperText={errors.city?.message}
                />
              </Box>

              <Box sx={{ flex: "1 1 100%", minWidth: { xs: '100%', sm: '250px' } }}>
                <TextField
                  label={t("profile.cityEn")}
                  placeholder={t("profile.cityEnPlaceholder")}
                  fullWidth
                  {...register("city_en")}
                  autoComplete="nope"
                  error={!!errors.city_en}
                  helperText={errors.city_en?.message || t("profile.autoFilled")}
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
                />
              </Box>
            </Box>

            {/* Регион/Область */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box sx={{ flex: "1 1 100%", minWidth: { xs: '100%', sm: '250px' } }}>
                <TextField
                   label={t("profile.region")}
                   placeholder={t("profile.regionPlaceholder")}
                  fullWidth
                  {...register("region")}
                  onBlur={handleTransliterate("region", "region_en")}
                  error={!!errors.region}
                  helperText={errors.region?.message}
                />
              </Box>

              <Box sx={{ flex: "1 1 100%", minWidth: { xs: '100%', sm: '250px' } }}>
                <TextField
                  label={t("profile.regionEn")}
                  placeholder={t("profile.regionEnPlaceholder")}
                  fullWidth
                  {...register("region_en")}
                  error={!!errors.region_en}
                  autoComplete="nope"
                  helperText={errors.region_en?.message || t("profile.autoFilled")}
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
                />
              </Box>
            </Box>

            {/* Почтовый индекс */}
            <TextField
              label={t("profile.postalCode")}
              placeholder={t("profile.postalCodePlaceholder")}
              fullWidth
              {...register("postal_code")}
              error={!!errors.postal_code}
              helperText={errors.postal_code?.message}
            />

            <Divider sx={{ my: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                🎁 {t("profile.wishlistSection")}
              </Typography>
            </Divider>

            {/* Wishlist */}
            <TextField
              label={t("profile.wishlist")}
              placeholder={t("profile.wishlistPlaceholder")}
              fullWidth
              multiline
              rows={4}
              {...register("wishlist")}
              error={!!errors.wishlist}
              helperText={errors.wishlist?.message}
            />

            {/* Anti-wishlist */}
            <TextField
              label={t("profile.antiWishlist")}
              placeholder={t("profile.antiWishlistPlaceholder")}
              fullWidth
              multiline
              rows={3}
              {...register("anti_wishlist")}
              error={!!errors.anti_wishlist}
              helperText={errors.anti_wishlist?.message}
            />

            {/* Кнопки */}
            <Box sx={{ 
              display: "flex", 
              gap: 2, 
              justifyContent: { xs: 'stretch', sm: 'flex-end' },
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/")}
                disabled={mutation.isPending}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
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
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {t("profile.save")}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
