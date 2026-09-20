import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/services/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { AppErrorBoundary } from '@/components/feedback/AppErrorBoundary';
import { ToastViewport } from '@/components/feedback/ToastViewport';
import { GlobalLoadingIndicator } from '@/components/feedback/GlobalLoadingIndicator';
import App from '@/App';
import '@/styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <LoadingProvider>
                <App />
                <ToastViewport />
                <GlobalLoadingIndicator />
              </LoadingProvider>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>
);
