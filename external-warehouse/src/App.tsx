import polyglotI18nProvider from 'ra-i18n-polyglot';
import {
  Admin,
  CustomRoutes,
  Resource,
  localStorageStore,
  StoreContextProvider,
  useAuthState
} from 'react-admin';
import { Navigate, Outlet, Route } from 'react-router-dom';

import { authProvider } from './adapters/authProvider';
import { dataProvider } from './adapters/dataProvider';
import japaneseMessages from './i18n/jp';
import { Layout } from './layout';
import { createTheme } from '@mui/material/styles';

import CustomLoginPage from './layout/CustomLogin';
import AdminPage from './admin/AdminPage';
import { StyledEngineProvider } from '@mui/material/styles';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { Box } from '@mui/material';
import { PropsWithChildren } from 'react';

import N002 from './view/N002';
import N003 from './view/N003';
import N004 from './view/N004';

import AppVersionPage from './view/AppVersionPage';
import S010 from './view/S010';
import S011 from './view/S011';
import S020 from './view/S020';
import S021 from './view/S021';
import S022 from './view/S022';
import S023 from './view/S023';
import S030 from './view/S030';
import S040 from './view/S040';
import S041 from './view/S041';
import S050 from './view/S050';
import S051 from './view/S051';
import S060 from './view/S060';
import S061 from './view/S061';
import S090 from './view/S090';
import S091 from './view/S091';
import S095 from './view/S095';



const i18nProvider = polyglotI18nProvider(() => japaneseMessages, 'jp');
const store = localStorageStore(undefined, 'ECommerce');

const theme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { height: '100%', overflow: 'hidden' },
        body: { height: '100%', margin: 0, padding: 0, overflow: 'hidden' },
        '#root': { height: '100%', overflow: 'hidden' }
      }
    }
  }
});

const RequireAuth = () => {
  const { authenticated } = useAuthState<Error>();
  if (!authenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const PublicRoute = () => <Outlet />;

const LoginLayout = ({ children }: PropsWithChildren<{}>) => {
  return (
    <Box sx={{
      height: '100%',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 0,
      margin: 0,
      '& *': { boxSizing: 'border-box' }
    }}>
      {children}
    </Box>
  );
};

const App = () => {
  const muiCache = createCache({
    key: 'react-admin-mui',
    prepend: true,
  });

  return (
    <StyledEngineProvider injectFirst>
      <CacheProvider value={muiCache}>
        <Admin
          loginPage={CustomLoginPage}
          title="Posters Galore Admin"
          dataProvider={dataProvider}
          authProvider={authProvider}
          store={store}
          layout={Layout}
          i18nProvider={i18nProvider}
          disableTelemetry
          theme={theme}
          requireAuth={true}
        >
          <CustomRoutes>
            <Route element={<PublicRoute />}>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/*" element={<AdminPage />} />
              <Route path="/login" element={<LoginLayout><Outlet /></LoginLayout>}>
                <Route index element={<CustomLoginPage />} />
                <Route path="verify/:type" element={<N003 />} />
                <Route path="send-email" element={<N002 />} />
              </Route>
            </Route>

            <Route element={<RequireAuth />}>
              <Route path="/" element={<Navigate to="/S050" replace />} />

              <Route path="/S010">
                <Route index element={<S010 />} />
                <Route path="S011" element={<S011 />} />
              </Route>

              <Route path="/S020">
                <Route index element={<S020 />} />
                <Route path="S021" element={<S021 />} />
                <Route path="S022" element={<S022 />} />
                <Route path="S023" element={<S023 />} />
              </Route>

              <Route path="/S030" element={<S030 />} />

              <Route path="/S040">
                <Route index element={<S040 />} />
                <Route path="S041/:operId" element={<S041 />} />
              </Route>

              <Route path="/S050">
                <Route index element={<S050 />} />
                <Route path="S051" element={<S051 />} />
              </Route>

              <Route path="/S060">
                <Route index element={<S060 />} />
                <Route path="S061" element={<S061 />} />
              </Route>

              <Route path="/S090">
                <Route index element={<S090 />} />
                <Route path="S091" element={<S091 />} />
                <Route path="S095" element={<S095 />} />
              </Route>

              <Route path="/appVersion" element={<AppVersionPage />} />
            </Route>
          </CustomRoutes>

          <Resource name="N004" list={N004} />
        </Admin>
      </CacheProvider>
    </StyledEngineProvider>
  );
};

const AppWrapper = () => (
  <StoreContextProvider value={store}>
    <App />
  </StoreContextProvider>
);

export default AppWrapper;