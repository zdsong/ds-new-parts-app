import * as React from 'react';
import { Loading } from 'react-admin';
import { Box } from '@mui/material';
import CustomAppBar from './AppBar';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense, useState } from 'react';
import { LoadingProvider } from './LoadingProvider';
import { GlobalLoadingOverlay } from './GlobalLoadingOverlay';
import { PopupMutexProvider } from './usePopupMutex';
import { authProvider } from '../adapters/authProvider';
import { Error } from './ErrorPage'


export default ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navigate = useNavigate()
    
  const isLoginRoute = location.pathname.startsWith('/login');
  
  const userStr = sessionStorage.getItem('user');
  const user = JSON.parse(userStr || '{}');
  const [n004Page, setN004Page] = useState(false)

  if(!user) return

  React.useEffect(() => {
    if(!isLoginRoute){
      if (location.pathname !== '/N004' && user.firstLogin) {
          navigate('/N004');
      }

      if(location.pathname === '/N004') setN004Page(true)
        else setN004Page(false)
      
    }
  }, [user, location.pathname]); 

  if(!authProvider.checkLogin() && !isLoginRoute) return

  return ( 
    <LoadingProvider>
      <PopupMutexProvider>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                {!isLoginRoute && !n004Page?<CustomAppBar />:''}
                <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 2 ,paddingTop: 0, paddingBottom: 0}}>
                <ErrorBoundary FallbackComponent={Error}>
                        <Suspense fallback={<Loading />}>{children}</Suspense>
                </ErrorBoundary>
                </Box>
                <GlobalLoadingOverlay />
            </Box>
        </PopupMutexProvider>
      </LoadingProvider>
  );
}
