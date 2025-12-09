import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import * as api from '../services/api';

const CreateGroup: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const group = await api.createGroup({
        name,
        description,
        budget,
        eventDate,
      });
      navigate(`/group/${group.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания группы');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{ mb: 3 }}
      >
        Назад
      </Button>

      <Card sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            🎁 Новая группа
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Создайте группу и пригласите друзей для игры в Тайного Санту
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Название группы"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Например: Новогодний офис 2024"
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              placeholder="Опишите правила или оставьте пожелания для участников"
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                fullWidth
                label="Бюджет"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="1000-2000 ₽"
              />

              <TextField
                fullWidth
                label="Дата обмена подарками"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Создание...' : 'Создать группу'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateGroup;

