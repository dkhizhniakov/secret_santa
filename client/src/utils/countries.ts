// Утилиты для работы со странами
import * as CountryFlagIcons from "country-flag-icons/react/3x2";
import i18n from "../i18n/config";

/**
 * Получает React компонент флага страны
 */
export const getCountryFlagComponent = (countryCode: string) => {
  return CountryFlagIcons[countryCode.toUpperCase() as keyof typeof CountryFlagIcons] || null;
};

/**
 * Получает название страны используя Intl.DisplayNames
 */
export const getCountryName = (countryCode: string, lang?: string): string => {
  try {
    // Используем текущий язык интерфейса если не указан явно
    const displayLang = lang || i18n.language || "en";
    const regionNames = new Intl.DisplayNames([displayLang], {
      type: "region",
    });
    return regionNames.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
};

/**
 * Получает название страны на языке текущего интерфейса (из i18next)
 */
export const getCountryNativeName = (countryCode: string): string => {
  return getCountryName(countryCode, i18n.language);
};

/**
 * Получает название страны на английском
 */
export const getCountryEnglishName = (countryCode: string): string => {
  return getCountryName(countryCode, "en");
};
