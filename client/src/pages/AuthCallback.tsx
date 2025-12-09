import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate(`/login?error=${error}`);
      return;
    }

    if (token) {
      setToken(token);
      navigate('/');
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate, setToken]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #c41e3a 0%, #165b33 100%)',
      }}
    >
      <CircularProgress sx={{ color: 'white', mb: 2 }} />
      <Typography color="white">Авторизация...</Typography>
    </Box>
  );
};

export default AuthCallback;

