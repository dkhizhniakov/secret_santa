import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { CardGiftcard } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

const JoinGroup: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Save invite code and redirect to login
      localStorage.setItem('pendingInvite', code || '');
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, code, navigate]);

  useEffect(() => {
    if (isAuthenticated && code) {
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, code]);

  const handleJoin = async () => {
    setJoining(true);
    setError('');

    try {
      const group = await api.joinGroup(code!);
      localStorage.removeItem('pendingInvite');
      navigate(`/group/${group.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не удалось присоединиться к группе');
      setJoining(false);
    }
  };

  if (authLoading || joining) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #c41e3a 0%, #165b33 100%)',
        }}
      >
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress color="primary" sx={{ mb: 2 }} />
          <Typography>Присоединяемся к группе...</Typography>
        </Card>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #c41e3a 0%, #165b33 100%)',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CardGiftcard sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Ошибка
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Button variant="contained" onClick={() => navigate('/')}>
              На главную
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return null;
};

export default JoinGroup;

