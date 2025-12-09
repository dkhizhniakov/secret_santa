import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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

// Schema validation
const createRaffleSchema = z.object({
  name: z.string().min(1, "Введите название").max(100, "Максимум 100 символов"),
  description: z.string().max(500, "Максимум 500 символов").optional(),
  budgetMin: z.number().min(0, "Минимум 0").optional(),
  budgetMax: z.number().min(0, "Минимум 0").optional(),
  currency: z.enum(["RUB", "USD", "EUR"]),
  eventDate: z.string().min(1, "Выберите дату"),
}).refine(
  (data) => {
    if (data.budgetMin && data.budgetMax) {
      return data.budgetMin <= data.budgetMax;
    }
    return true;
  },
  {
    message: "Минимум не может быть больше максимума",
    path: ["budgetMax"],
  }
);

type CreateRaffleForm = z.infer<typeof createRaffleSchema>;

// Дефолтная дата - 31 декабря текущего года
const getDefaultEventDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  return `${year}-12-31`;
};

const CreateRaffle = () => {
  const navigate = useNavigate();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: { errors },
  } = useForm<CreateRaffleForm>({
    resolver: zodResolver(createRaffleSchema),
    defaultValues: {
      name: "",
      description: "",
      budgetMin: undefined,
      budgetMax: undefined,
      currency: "RUB",
      eventDate: getDefaultEventDate(),
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
  });

  const createRaffleMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.createRaffle>[0]) => api.createRaffle(data),
    onSuccess: (raffle) => {
      navigate(`/raffle/${raffle.id}`);
    },
    onError: (error: any) => {
      setFormError("root", {
        message: error.response?.data?.error || "Ошибка создания розыгрыша",
      });
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
        message: error.response?.data?.error || "Ошибка загрузки аватара",
      });
    }
  };

  const isSubmitting = uploadAvatarMutation.isPending || createRaffleMutation.isPending;

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate("/")}
        sx={{ mb: 3 }}
      >
        Назад
      </Button>

      <Card sx={{ maxWidth: 600, mx: "auto" }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            🎁 Новый розыгрыш
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Создайте розыгрыш и пригласите друзей для игры в Тайного Санту
          </Typography>

          {errors.root && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.root.message}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Аватар */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Avatar
                src={avatarPreview || undefined}
                sx={{ width: 80, height: 80 }}
              >
                🎅
              </Avatar>
              <Box>
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
                    Загрузить аватар
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
                  Опционально
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
                  label="Название розыгрыша"
                  placeholder="Например: Новогодний офис 2024"
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
                  label="Описание"
                  multiline
                  rows={3}
                  placeholder="Опишите правила или оставьте пожелания для участников"
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Бюджет подарка
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              <Controller
                name="budgetMin"
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="От"
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
                    label="До"
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
                    label="Валюта"
                    error={!!errors.currency}
                    helperText={errors.currency?.message}
                    sx={{ minWidth: 120 }}
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
                  label="Дата обмена подарками"
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
              {isSubmitting ? "Создание..." : "Создать розыгрыш"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateRaffle;
