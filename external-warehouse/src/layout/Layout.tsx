import * as React from 'react';
import { Loading } from 'react-admin';
import { Box } from '@mui/material';
import CustomAppBar from './AppBar';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense, useRef, useState } from 'react';
import { LoadingProvider } from './LoadingProvider';
import { GlobalLoadingOverlay } from './GlobalLoadingOverlay';
import { PopupMutexProvider } from './usePopupMutex';
import { authProvider } from '../adapters/authProvider';
import { Error } from './ErrorPage'
import useAutoSwitchDeviceRoute from './useAutoSwitchDeviceRoute';


/** 画面遷移のたびに、外枠とウィンドウのスクロール位置を先頭へ戻す */
const resetPageScroll = (main: HTMLElement | null): void => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  if (main) {
    main.scrollTop = 0;
  }
};

export default ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const navigate = useNavigate()

  // ブラウザの戻るで、前回のスクロール位置が画面外へ残るのを防ぐ。
  // iOS Safari は popstate の後に位置を復元するため、描画後にもう一度戻す。
  React.useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    const reset = () => resetPageScroll(mainRef.current);
    reset();
    const frame = window.requestAnimationFrame(reset);
    const timer = window.setTimeout(reset, 100);
    window.addEventListener('pageshow', reset);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', reset);
    };
  }, [location.key]);

  // 端末（PC／SP）の切り替えに合わせて、対応する画面へ自動で切り替える
  useAutoSwitchDeviceRoute();
    
  const isLoginRoute = location.pathname.startsWith('/login');
  
  const userStr = sessionStorage.getItem('user');
  const user = JSON.parse(userStr || '{}');
  const [p004Page, setP004Page] = useState(false)

  if(!user) return

  React.useEffect(() => {
    if(!isLoginRoute){
      if (location.pathname !== '/P004' && user.firstLogin) {
          navigate('/P004');
      }

      if(location.pathname === '/P004') setP004Page(true)
        else setP004Page(false)
      
    }
  }, [user, location.pathname]); 

  if(!authProvider.checkLogin() && !isLoginRoute) return

  return ( 
    <LoadingProvider>
      <PopupMutexProvider>
            {/* 高さは --app-vh（モバイルでは dvh）に合わせる。
                100vh だとブラウザ下部ツールバー分だけ画面が下にはみ出し、
                画面下端のボタンや入力欄が隠れる。 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 'var(--app-vh)' }}>
                {!isLoginRoute && !p004Page?<CustomAppBar />:''}
                <Box component="main" ref={mainRef} sx={{ flex: 1, overflow: 'auto', overscrollBehavior: 'none', p: 2 ,paddingTop: 0,
                    // iPhone のホームインジケーター（画面下端の横棒）に内容が重ならないようにする
                    paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
