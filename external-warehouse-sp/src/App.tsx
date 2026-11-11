import polyglotI18nProvider from 'ra-i18n-polyglot';
import {
    Admin,
    CustomRoutes,
    Resource,
    localStorageStore,
    useStore,
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
import { StyledEngineProvider } from '@mui/material/styles';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { Box } from '@mui/material';
import { PropsWithChildren } from 'react';

import N006 from './view/N006';
import N010 from './view/N010';
import N002 from './view/N002';
import N003 from './view/N003';
import N004 from './view/N004';
import N007 from './view/N007';
import N008 from './view/N008';
import N015 from './view/N015';
import N016 from './view/N016';



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
              <Route path="/login" element={<LoginLayout><Outlet /></LoginLayout>}>
                <Route index element={<CustomLoginPage />} /> 
                <Route path="verify/:type" element={<N003 />} /> 
                <Route path="send-email" element={<N002 />} /> 
              </Route>
            </Route>
            
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Navigate to="/N006" replace />} />
              <Route path="/N006">
                <Route index element={<N006 />} />
                <Route path="N007/:orderId/:message" element={<N007 />} />
                <Route path="N007/:orderId" element={<N007 />} />
              </Route>
              <Route path="/N010/:cd" element={<N010 />} />
              <Route path="/N016/:cd" element={<N016 />} />
            </Route>
          </CustomRoutes>

          <Resource name="N004" list={N004} />
          <Resource name="N006" list={N006} />
          <Resource name="N008" list={N008} />
          <Resource name="N010" list={N010} />
          <Resource name="N015" list={N015} />
          <Resource name="N016" list={N016} />
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