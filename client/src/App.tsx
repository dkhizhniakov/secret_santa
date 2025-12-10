import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { theme } from './theme';
import Layout from './components/Layout';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CreateRaffle from './pages/CreateRaffle';
import RaffleDetail from './pages/RaffleDetail';
import JoinRaffle from './pages/JoinRaffle';
import GifteePage from './pages/GifteePage';

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return null;
  }
  
  if (!isAuthenticated) {
    // Сохраняем текущий URL для возврата после логина
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return null;
  }
  
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/join/:code" element={<PrivateRoute><JoinRaffle /></PrivateRoute>} />
              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="create" element={<CreateRaffle />} />
                <Route path="raffle/:id" element={<RaffleDetail />} />
                <Route path="raffle/:id/giftee" element={<GifteePage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
