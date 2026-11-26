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
import notifyMessages from './i18n/notify';
import { Layout } from './layout';
import { createTheme } from '@mui/material/styles';
import { applyThemeVars, resolveInitialTheme, applyFontSize, resolveInitialFontSize } from './styles/themeVars';

// モジュール読み込み時に即座にテーマ色とフォントサイズを CSS 変数へ反映する。
// ThemeToggel を AppBar から削除したため、ここで初期化しないと
// var(--mui-page-header-color) などが未定義になり、ボタンや見出しが消える。
if (typeof document !== 'undefined') {
  applyThemeVars(resolveInitialTheme());
  // body はまだ存在しない場合があるため、DOMContentLoaded でフォントを適用する
  if (document.body) {
    applyFontSize(resolveInitialFontSize());
  } else {
    document.addEventListener('DOMContentLoaded', () => applyFontSize(resolveInitialFontSize()));
  }
}

import CustomLoginPage from './layout/CustomLogin';
import AdminPage from './admin/AdminPage';
import { StyledEngineProvider } from '@mui/material/styles';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { Box } from '@mui/material';
import { PropsWithChildren } from 'react';

import P002 from './view/P002';
import P003 from './view/P003';
import P004 from './view/P004';
import P008 from './view/P008';
import P010 from './view/P010';

import AppVersionPage from './view/AppVersionPage';
import { HOME_ROUTE } from './utils/appRoutes';
import C013 from './view/C013';
import C014 from './view/C014';
import C015 from './view/C015';
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
import P303 from './view/P303';
import P304 from './view/P304';
import P305 from './view/P305';
import P403 from './view/P403';
import P404 from './view/P404';
import P405 from './view/P405';
import P401 from './view/P401';
import P501 from './view/P501';
import P502 from './view/P502';
import P503 from './view/P503';
import SP301 from './view/SP301';
import SP302 from './view/SP302';
import SP303 from './view/SP303';
import SP304 from './view/SP304';
import SP305 from './view/SP305';
import SP401 from './view/SP401';
import SP402 from './view/SP402';
import SP403 from './view/SP403';
import SP404 from './view/SP404';
import SP405 from './view/SP405';
import SP406 from './view/SP406';
import P402 from './view/P402';
import P406 from './view/P406';
import P407 from './view/P407';
import P601 from './view/P601';
import P602 from './view/P602';
import P603 from './view/P603';
import P604 from './view/P604';
import P605 from './view/P605';
import P606 from './view/P606';
import P001 from './view/P001';


const i18nProvider = polyglotI18nProvider(() => ({ ...japaneseMessages, notify: notifyMessages }), 'jp');
const store = localStorageStore(undefined, 'ECommerce');

const theme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // ウィンドウいっぱいにする。100dvh だと下端に余白が残り、スクロールバーも届かない。
        html: { height: '100%', overflow: 'hidden' },
        body: { height: '100%', margin: 0, padding: 0, overflow: 'hidden' },
        '#root': { height: '100%', overflow: 'hidden' },
        // ダイアログなどの MUI 主ボタンも、選択中の共通スタイル色に合わせる
        '.MuiButton-containedPrimary': {
          backgroundColor: 'var(--mui-page-header-color)',
        },
        '.MuiButton-containedPrimary:hover': {
          backgroundColor: 'color-mix(in srgb, var(--mui-page-header-color) 85%, black 15%)',
        },
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
                <Route path="verify/:type" element={<P003 />} />
                <Route path="send-email" element={<P002 />} />
              </Route>
            </Route>

            <Route element={<RequireAuth />}>
              {/* ログイン後の初期表示（ホーム） */}
              <Route path="/" element={<Navigate to={HOME_ROUTE} replace />} />
              <Route path="/P001" element={<P001 />} />

              <Route path="/C013">
                <Route index element={<C013 />} />
                <Route path="C014/:cd" element={<C014 />} />
                <Route path="C015/:cd?" element={<C015 />} />
              </Route>

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

              {/* ①パレット番号管理：発番・一覧・詳細 */}
              <Route path="/P303" element={<P303 />} />
              <Route path="/P304" element={<P304 />} />
              <Route path="/P305" element={<P305 />} />

              {/* ①パレット番号管理（SP）：製品・部品選択〜パレット情報詳細 */}
              <Route path="/SP301" element={<SP301 />} />
              <Route path="/SP302" element={<SP302 />} />
              <Route path="/SP303" element={<SP303 />} />
              <Route path="/SP304" element={<SP304 />} />
              <Route path="/SP305" element={<SP305 />} />

              {/* ③移動管理（スマホ）4.1 バーコード読み取り。入庫は ?kind=receive */}
              <Route path="/SP401" element={<SP401 />} />
              {/* ③移動管理 1-3 移動登録 */}
              <Route path="/SP402" element={<SP402 />} />
              {/* ③移動管理 4.3 在庫検索 */}
              <Route path="/SP403" element={<SP403 />} />
              {/* ③移動管理 移動依頼 */}
              <Route path="/SP404" element={<SP404 />} />
              {/* ③移動管理 1-4 パレット番号表印刷（移動登録完了） */}
              <Route path="/SP405" element={<SP405 />} />
              {/* ③移動管理 2. パレットを受け取る場合（移動先）のバーコード読み取り */}
              <Route path="/SP406" element={<SP406 />} />
              {/* ③移動管理 移動一覧 */}
              <Route path="/P402" element={<P402 />} />

              {/* ②移動依頼管理：①行田工場から外部倉庫へ移動する場合（出庫） */}
              <Route path="/P401" element={<P401 />} />
              {/* ④在庫管理：在庫一覧（部品） */}
              <Route path="/P501" element={<P501 />} />
              {/* ④在庫管理：在庫詳細（品目） */}
              <Route path="/P502" element={<P502 />} />
              {/* ④在庫管理：在庫詳細（ロケ番） */}
              <Route path="/P503" element={<P503 />} />
              <Route path="/P406" element={<P406 />} />
              {/* ③移動管理 3. 移動登録情報を確認する（移動情報詳細） */}
              <Route path="/P407" element={<P407 />} />
              {/* ②移動依頼管理：2. 移動依頼を確認する（生産管理） */}
              <Route path="/P403" element={<P403 />} />
              <Route path="/P404" element={<P404 />} />
              <Route path="/P405" element={<P405 />} />

              {/* ⑤ロケ番マスタ：一覧・新規登録・更新 */}
              <Route path="/P601" element={<P601 />} />
              <Route path="/P602" element={<P602 />} />
              <Route path="/P603" element={<P603 />} />
              {/* マスター：ユーザー倉庫関係 一覧・新規・更新 */}
              <Route path="/P604" element={<P604 />} />
              <Route path="/P605" element={<P605 />} />
              <Route path="/P606" element={<P606 />} />

              {/* 部品マスタ：詳細 */}
              <Route path="/P010/:cd" element={<P010 />} />

              <Route path="/appVersion" element={<AppVersionPage />} />
            </Route>
          </CustomRoutes>

          <Resource name="P004" list={P004} />
          <Resource name="P008" list={P008} />
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