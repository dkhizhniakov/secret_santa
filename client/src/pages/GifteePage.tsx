import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Alert,
  Skeleton,
  Divider,
} from "@mui/material";
import {
  ArrowBack,
  Phone,
  LocationOn,
  CardGiftcard,
  Block,
} from "@mui/icons-material";
import * as api from "../services/api";

const GifteePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: giftee, isLoading, error } = useQuery({
    queryKey: ["giftee", id],
    queryFn: () => api.getMyGiftee(id!),
    enabled: !!id,
    retry: false,
  });

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={300} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/raffle/${id}`)}
          sx={{ mb: 3 }}
        >
          {t("common.back")}
        </Button>
        <Alert severity="error">
          {(error as any).response?.data?.error || t("giftee.errorLoading")}
        </Alert>
      </Box>
    );
  }

  if (!giftee) {
    return null;
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/raffle/${id}`)}
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        {t("common.back")}
      </Button>

      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        🎁 {t("giftee.title")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: { xs: 3, sm: 4 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
        {t("giftee.subtitle")}
      </Typography>

      {/* Основная информация */}
      <Card sx={{ mb: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: { xs: 2, sm: 3 }, 
            mb: { xs: 2, sm: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
            textAlign: { xs: 'center', sm: 'left' }
          }}>
            <Avatar
              src={giftee.avatarUrl || undefined}
              sx={{ width: { xs: 64, sm: 80 }, height: { xs: 64, sm: 80 } }}
            >
              {giftee.name[0]}
            </Avatar>
            <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {giftee.name}
              </Typography>
              {giftee.about && (
                <Typography color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  {giftee.about}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Wishlist */}
          {giftee.wishlist && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <CardGiftcard color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  {t("giftee.wishlist")}
                </Typography>
              </Box>
              <Alert severity="info" sx={{ bgcolor: "success.light", color: "success.dark" }}>
                {giftee.wishlist}
              </Alert>
            </Box>
          )}

          {/* Anti-wishlist */}
          {giftee.anti_wishlist && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Block color="error" />
                <Typography variant="h6" fontWeight={600}>
                  {t("giftee.antiWishlist")}
                </Typography>
              </Box>
              <Alert severity="warning">
                {giftee.anti_wishlist}
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Контактная информация */}
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {t("giftee.contactInfo")}
          </Typography>
          <Alert severity="info" sx={{ mb: { xs: 2, sm: 3 } }}>
            {t("giftee.privacyNotice")}
          </Alert>

          {/* Телефон */}
          {giftee.phone && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Phone fontSize="small" color="action" />
                <Typography fontWeight={600}>{t("profile.phone")}</Typography>
              </Box>
              <Typography>{giftee.phone}</Typography>
            </Box>
          )}

          {/* Адрес */}
          {(giftee.address_line1 || giftee.city || giftee.country) && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <LocationOn fontSize="small" color="action" />
                <Typography fontWeight={600}>{t("giftee.deliveryAddress")}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t("giftee.localAddress")}
                </Typography>
                {giftee.address_line1 && <Typography>{giftee.address_line1}</Typography>}
                {giftee.address_line2 && <Typography>{giftee.address_line2}</Typography>}
                {giftee.city && <Typography>{giftee.city}</Typography>}
                {giftee.region && <Typography>{giftee.region}</Typography>}
                {giftee.postal_code && <Typography>{giftee.postal_code}</Typography>}
                {giftee.country && <Typography>{giftee.country}</Typography>}
              </Box>

              {(giftee.address_line1_en || giftee.city_en) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t("giftee.englishAddress")}
                    </Typography>
                    {giftee.address_line1_en && <Typography>{giftee.address_line1_en}</Typography>}
                    {giftee.address_line2_en && <Typography>{giftee.address_line2_en}</Typography>}
                    {giftee.city_en && <Typography>{giftee.city_en}</Typography>}
                    {giftee.region_en && <Typography>{giftee.region_en}</Typography>}
                    {giftee.postal_code && <Typography>{giftee.postal_code}</Typography>}
                    {giftee.country && <Typography>{giftee.country}</Typography>}
                  </Box>
                </>
              )}
            </Box>
          )}

          {!giftee.phone && !giftee.address_line1 && !giftee.city && (
            <Alert severity="warning">
              {t("giftee.noContactInfo")}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default GifteePage;

