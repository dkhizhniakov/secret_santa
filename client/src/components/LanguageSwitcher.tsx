import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as flags from "country-flag-icons/react/3x2";

const languages = [
  { code: "ru", name: "Русский", flagCode: "RU" },
  { code: "en", name: "English", flagCode: "GB" },
  { code: "es", name: "Español", flagCode: "ES" },
];

// Получаем компонент флага страны из библиотеки
const getFlagComponent = (countryCode: string) => {
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

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    handleClose();
  };

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  return (
    <>
      <IconButton onClick={handleClick} color="inherit">
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 0.5 }}>
          {getFlagComponent(currentLanguage.flagCode)}
        </Box>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            selected={i18n.language === lang.code}
          >
            <ListItemIcon>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {getFlagComponent(lang.flagCode)}
              </Box>
            </ListItemIcon>
            <ListItemText>{lang.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
