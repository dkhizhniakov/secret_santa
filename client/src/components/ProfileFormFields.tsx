import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { TextField, Typography, Alert, Box, Autocomplete, FormControlLabel, Switch } from "@mui/material";
import {
  MuiTelInput,
  MuiTelInputCountry,
  MuiTelInputInfo,
} from "mui-tel-input";
import { getCountries } from "libphonenumber-js";
import * as CountryFlagIcons from "country-flag-icons/react/3x2";
import transliterate from "@sindresorhus/transliterate";

export interface ProfileFormData {
  phone?: string | null;
  about?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  address_line1_en?: string | null;
  address_line2_en?: string | null;
  city_en?: string | null;
  region_en?: string | null;
  wishlist?: string | null;
  anti_wishlist?: string | null;
}

interface ProfileFormFieldsProps {
  control: Control<ProfileFormData>;
  errors: FieldErrors<ProfileFormData>;
  register: UseFormRegister<ProfileFormData>;
  setValue: UseFormSetValue<ProfileFormData>;
  watch: any;
  detectedCountry?: MuiTelInputCountry;
  onPhoneChange?: (value: string, info: MuiTelInputInfo) => void;
  showPrivacyNotice?: boolean;
  compact?: boolean;
}

export const ProfileFormFields = ({
  control,
  errors,
  register,
  setValue,
  watch,
  detectedCountry = "RU",
  onPhoneChange,
  showPrivacyNotice = true,
  compact = false,
}: ProfileFormFieldsProps) => {
  const { t, i18n } = useTranslation();
  const [showEnglishAddress, setShowEnglishAddress] = useState(false);

  const addressLine1 = watch("address_line1");
  const addressLine2 = watch("address_line2");
  const city = watch("city");
  const region = watch("region");

  // Автотранслитерация
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

  const handleTransliterate = (
    sourceField: keyof ProfileFormData,
    targetField: keyof ProfileFormData
  ) => {
    return () => {
      const value = watch(sourceField);
      if (value && typeof value === "string") {
        setValue(targetField, transliterate(value) as any, {
          shouldDirty: true,
        });
      }
    };
  };

  const spacing = compact ? 2 : 2.5;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: spacing }}>
      {showPrivacyNotice && (
        <Alert severity="info" icon="🔒">
          <span
            dangerouslySetInnerHTML={{ __html: t("profile.privacyNotice") }}
          />
        </Alert>
      )}

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
              onPhoneChange?.(value, info);
            }}
            label={t("profile.phone")}
            defaultCountry={detectedCountry}
            preferredCountries={["ES", "RU", "AM"]}
            langOfCountryName={i18n.language}
            getFlagElement={(countryCode) => {
              const FlagComponent = (CountryFlagIcons as any)[countryCode];
              return FlagComponent ? (
                <FlagComponent
                  style={{ width: "24px", height: "16px", borderRadius: "2px" }}
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
            MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
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

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mt: 0,
            mb: 0,
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          📦 {t("profile.addressSection")}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={showEnglishAddress}
              onChange={(e) => setShowEnglishAddress(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              🌍 {t("profile.englishVersion")}
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </Box>

      {/* Страна */}
      <Controller
        name="country"
        control={control}
        render={({ field, fieldState }) => (
          <Autocomplete
            options={SORTED_COUNTRIES}
            getOptionLabel={(option) => option.name}
            value={SORTED_COUNTRIES.find((c) => c.code === field.value) || null}
            onChange={(_, newValue) => field.onChange(newValue?.code || "")}
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

      {/* Адрес строка 1 */}
      <TextField
        label={t("profile.addressLine1")}
        placeholder={t("profile.addressLine1Placeholder")}
        fullWidth
        {...register("address_line1")}
        onBlur={handleTransliterate("address_line1", "address_line1_en")}
        error={!!errors.address_line1}
        helperText={errors.address_line1?.message || t("profile.addressHelp.line1Help")}
      />

      {showEnglishAddress && (
        <TextField
          label={t("profile.addressLine1En")}
          placeholder={t("profile.addressLine1EnPlaceholder")}
          fullWidth
          {...register("address_line1_en")}
          autoComplete="nope"
          error={!!errors.address_line1_en}
          helperText={errors.address_line1_en?.message || t("profile.autoFilled")}
          slotProps={{
            htmlInput: {
              autoComplete: "chrome-off",
              "data-form-type": "other",
            },
            input: { sx: { bgcolor: "action.hover" } },
            inputLabel: { shrink: true },
          }}
        />
      )}

      {/* Адрес строка 2 */}
      <TextField
        label={t("profile.addressLine2")}
        placeholder={t("profile.addressLine2Placeholder")}
        fullWidth
        {...register("address_line2")}
        onBlur={handleTransliterate("address_line2", "address_line2_en")}
        error={!!errors.address_line2}
        helperText={errors.address_line2?.message || t("profile.addressHelp.line2Help")}
      />

      {showEnglishAddress && (
        <TextField
          label={t("profile.addressLine2En")}
          placeholder={t("profile.addressLine2EnPlaceholder")}
          fullWidth
          {...register("address_line2_en")}
          autoComplete="nope"
          error={!!errors.address_line2_en}
          helperText={errors.address_line2_en?.message || t("profile.autoFilled")}
          slotProps={{
            htmlInput: {
              autoComplete: "chrome-off",
              "data-form-type": "other",
            },
            input: { sx: { bgcolor: "action.hover" } },
            inputLabel: { shrink: true },
          }}
        />
      )}

      {/* Город */}
      <TextField
        label={t("profile.city")}
        placeholder={t("profile.cityPlaceholder")}
        fullWidth
        {...register("city")}
        onBlur={handleTransliterate("city", "city_en")}
        error={!!errors.city}
        helperText={errors.city?.message}
      />

      {showEnglishAddress && (
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
            input: { sx: { bgcolor: "action.hover" } },
            inputLabel: { shrink: true },
          }}
        />
      )}

      {/* Регион/Область */}
      <TextField
        label={t("profile.region")}
        placeholder={t("profile.regionPlaceholder")}
        fullWidth
        {...register("region")}
        onBlur={handleTransliterate("region", "region_en")}
        error={!!errors.region}
        helperText={errors.region?.message}
      />

      {showEnglishAddress && (
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
            input: { sx: { bgcolor: "action.hover" } },
            inputLabel: { shrink: true },
          }}
        />
      )}

      {/* Почтовый индекс */}
      <TextField
        label={t("profile.postalCode")}
        placeholder={t("profile.postalCodePlaceholder")}
        fullWidth
        {...register("postal_code")}
        error={!!errors.postal_code}
        helperText={errors.postal_code?.message}
      />
    </Box>
  );
};
