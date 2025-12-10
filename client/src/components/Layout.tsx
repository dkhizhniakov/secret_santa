import React from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import { CardGiftcard, Add, Logout, Person } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #faf9f6 0%, #f0ebe3 100%)' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
          <IconButton 
            component={Link} 
            to="/"
            sx={{ 
              mr: { xs: 0.5, sm: 1 }, 
              color: 'primary.main',
              p: 0.5
            }}
          >
            <CardGiftcard sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
          
          <Typography
            component={Link}
            to="/"
            variant="h6"
            sx={{ 
              flexGrow: 1, 
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              display: { xs: 'none', sm: 'block' },
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': {
                opacity: 0.8
              }
            }}
          >
            {t('app.name')}
          </Typography>
          
          {/* Пустое пространство для мобильных */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              display: { xs: 'block', sm: 'none' } 
            }}
          />
          
          {/* Кнопка создания - на мобильных только иконка */}
          <Button
            component={Link}
            to="/create"
            startIcon={<Add sx={{ display: { xs: 'none', sm: 'block' } }} />}
            variant="contained"
            sx={{ 
              mr: { xs: 0.5, sm: 2 },
              minWidth: { xs: 40, sm: 'auto' },
              px: { xs: 1, sm: 2 },
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              {t('nav.createRaffle')}
            </Box>
            <Add sx={{ display: { xs: 'block', sm: 'none' } }} />
          </Button>

          <LanguageSwitcher />

          <IconButton onClick={handleMenu} sx={{ ml: { xs: 0.5, sm: 1 } }}>
            <Avatar 
              src={user?.avatar_url || undefined}
              sx={{ bgcolor: 'primary.main', width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 } }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user?.name}
              </Typography>
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
              <Person sx={{ mr: 1, fontSize: 20 }} />
              {t('nav.myProfile')}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1, fontSize: 20 }} />
              {t('nav.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default Layout;

