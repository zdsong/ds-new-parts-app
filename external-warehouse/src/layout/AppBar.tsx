import * as React from 'react';
import { AppBar, AppBarProps } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { CustomAppBarMenu } from './Menu';
import { MessageChatAppBar } from './MessageChat'

import { AppBarSx } from '../styles/layoutSx';
import customIcon from '../assets/icons/logo-icon.png';
import { useLocation, useNavigate } from 'react-router';
import { Notice } from './Notice';
import ThemeToggle from './ThemeToggel';
import LoginUserInfoBar from './LoginUserInfo';
import { fetchAdminMenus, AdminMenu } from '../admin/adminApi';
import { useIsMobile } from '../utils/deviceUtil';
import { HOME_ROUTE } from '../utils/appRoutes';

import SIcon from '../assets/icons/S.png';
import DIcon from '../assets/icons/D.png';
const themeIcon  = import.meta.env.VITE_THEME_ICON;

/**
 * 画面幅に応じて連続的に変化させる寸法（clamp による線形補間）
 *
 * 計算式：clamp(最小値, calc(A + B vw), 最大値)
 *   ・390px（スマートフォン）で最小値
 *   ・1200px 以上で最大値＝PC の従来値
 *   A = 最小値 - 0.4815 * (最大値 - 最小値) ／ B = (最大値 - 最小値) / 8.1
 * 幅が狭くなるほどロゴとタイトル文字が少しずつ縮み、レイアウト自体は崩さない。
 */
const FLUID = {
  // ロゴの高さ：28px → 40px
  logoHeight: 'clamp(28px, calc(22.2px + 1.48vw), 40px)',
  // タイトル文字：13px → 20px
  titleFont: 'clamp(15px, calc(9.6px + 0.86vw), 20px)',
  // スマートフォンの副題（親メニュー名）：17px → 22px
  // 画面上部の見出しとして目立たせるため、PC のシステム名より少し大きめにする
  mobileTitleFont: 'clamp(17px, calc(11.2px + 0.86vw), 22px)',
};

/**
 * 表示を切り替える画面幅
 * ・900px 未満（MUI の md 未満）：ログインユーザー情報（ID・最終ログイン・ログアウト）を非表示
 * ・600px 未満（MUI の sm 未満）：ロゴアイコンを非表示（タイトルとメニューアイコンだけ残す）
 */
const hideUserInfoSx = { display: { xs: 'none', md: 'flex' } };
const hideLogoBelowSmSx = { display: { xs: 'none', sm: 'block' } };

// システム名（PC 表示時のタイトル）
const APP_TITLE = '外部倉庫管理システム（仮称）';

interface MenuItem {
  name: string,
  hidden?: boolean,
  component?: string,
  path?: string,
  meta: any,
  children?: MenuItem[],
}

/**
 * ルート名ごとのメニュー名
 * ・current：画面自身のメニュー名
 * ・parent ：直上の親メニュー名（親が無い場合は自身のメニュー名）
 * モバイル表示では画面幅が狭くメニュー階層が見えないため、親メニュー名をタイトルに使う。
 */
interface MenuTitleMaps {
  current: Record<string, string>;
  parent: Record<string, string>;
}

// 既存画面が存在するルート名の一覧
const AVAILABLE_ROUTES = [
  'C005',
  'C013',
  'S010',
  'S020',
  'S030',
  'S040',
  'S050',
  'S060',
  'S090',
  'P303',
  'P304',
  'P305',
  'P008',
  'P401',
  'P403',
  'P404',
  'P405',
  'P406',
  'SP301',
  'SP302',
  'SP303',
  'SP304',
  'SP305',
  'SP401',
  'SP402',
  'SP403',
  'SP404',
  'SP405',
  'SP406',
  'P601',
  'appVersion',
];

// メニューの遷移先を決定する
const resolveMenuName = (menu: AdminMenu) => {
  return AVAILABLE_ROUTES.includes(menu.routeName)
    ? menu.routeName
    : `admin/${menu.path}`;
};

// フラットなメニュー一覧から親子階層のメニューを構築する
const buildMenuItems = (menus: AdminMenu[]): MenuItem[] => {
  // ボタン種別・非表示・停止中のメニューは対象外とする
  // 同じ menu_id が重複して返る場合に備えて、2 件目以降は読み捨てる
  const seenMenuIds = new Set<string>();
  const validMenus = menus
    .filter((menu) => {
      if (menu.menuType === 'F' || menu.status === '1' || menu.visible === '1') return false;
      const menuId = String(menu.menuId);
      if (seenMenuIds.has(menuId)) return false;
      seenMenuIds.add(menuId);
      return true;
    })
    .sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0));

  const nodeMap = new Map<string, MenuItem>();
  validMenus.forEach((menu) => {
    nodeMap.set(String(menu.menuId), {
      name: resolveMenuName(menu),
      meta: { title: menu.menuName, menuType: menu.menuType },
      children: [],
    });
  });

  const roots: MenuItem[] = [];
  validMenus.forEach((menu) => {
    const node = nodeMap.get(String(menu.menuId))!;
    const parent = nodeMap.get(String(menu.parentId));
    if (String(menu.parentId) === '0' || !parent) {
      roots.push(node);
    } else {
      parent.children = parent.children || [];
      parent.children.push(node);
    }
  });

  // 子メニューを持たない項目は遷移可能な項目として扱い、空のディレクトリは除外する
  const normalize = (items: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = [];
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        const children = normalize(item.children);
        if (children.length > 0) {
          item.children = children;
          result.push(item);
          return;
        }
      }
      delete item.children;
      // 配下に表示可能なメニューが無いディレクトリは表示しない
      if (item.meta?.menuType !== 'M') {
        result.push(item);
      }
    });
    return result;
  };
  return normalize(roots);
};

// メニュー取得結果のキャッシュ（トークン単位）
// 再マウントや HMR で effect が再実行されても、取得は 1 回で済ませる
let menuCache: { token: string; items: MenuItem[] } | null = null;
let menuPending: { token: string; promise: Promise<MenuItem[]> } | null = null;

/**
 * 管理メニューを取得する
 * ・同じトークンで取得済みならキャッシュを返す
 * ・取得中の場合は同じ Promise を共有する（二重リクエスト防止）
 */
const loadMenuItems = (): Promise<MenuItem[]> => {
  const token = sessionStorage.getItem('externalWarehouseToken') || '';

  if (menuCache && menuCache.token === token) {
    return Promise.resolve(menuCache.items);
  }
  if (menuPending && menuPending.token === token) {
    return menuPending.promise;
  }

  const promise = fetchAdminMenus()
    .then((menus) => {
      const items = buildMenuItems(menus);
      menuCache = { token, items };
      if (menuPending && menuPending.token === token) menuPending = null;
      return items;
    })
    .catch(() => {
      // 管理メニューが取得できない場合は既存メニューのみ表示する（次回再試行できるようにする）
      if (menuPending && menuPending.token === token) menuPending = null;
      return [] as MenuItem[];
    });

  menuPending = { token, promise };
  return promise;
};

// AppBarコンテナスタイル
const AppBarContainer = styled(Box)(({ theme }) => ({
  ...AppBarSx.AppBarContainerSx,
}));

// 左側セクションスタイル
const LeftSection = styled(Box)(({ theme }) => ({
  ...AppBarSx.LeftSectionSx,
  gap: theme.spacing(AppBarSx.LeftSectionSx.gap),
}));

// 右側セクションスタイル
const RightSection = styled(Box)(({ theme }) => ({
  ...AppBarSx.RightSectionSx,
  gap: theme.spacing(AppBarSx.RightSectionSx.gap),
}));

interface RightToolbarProps {
  children?: React.ReactNode;
  className?: string;
} 

// デフォルト右側ツールバーコンポーネント
const EmptyRightToolbar: React.FC<RightToolbarProps> = ({ 
}) => {

  // メニューアイテム初期データ
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);

  // 管理メニューの読み込み
  React.useEffect(() => {
    let active = true;
    loadMenuItems().then((items) => {
      if (!active || items.length === 0) return;
      // 追記ではなく置き換える（effect 再実行時に同じメニューが二重に並ぶのを防ぐ）
      setMenuItems(items);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
  <Box
  sx={{
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'end',
  }}>
    <ThemeToggle></ThemeToggle>
    {/* <MessageChatAppBar></MessageChatAppBar>
    <Notice></Notice> */}
    {/* ログインユーザー情報（ID・最終ログイン・ログアウト）
        画面幅が狭いときは表示しない（メニューアイコンの領域を確保する） */}
    <Box sx={hideUserInfoSx}>
      <LoginUserInfoBar />
    </Box>
    <CustomAppBarMenu menuItems={menuItems}></CustomAppBarMenu>
  </Box>
);}

// カスタムAppBarプロップス型定義
interface CustomAppBarProps extends Omit<AppBarProps, 'sx' | 'toolbar'> {
  rightToolbar?: React.ComponentType<RightToolbarProps>;
  rightToolbarProps?: RightToolbarProps;
  sx?: AppBarProps['sx'];
}

// カスタムAppBarコンポーネント
const CustomAppBar: React.FC<CustomAppBarProps> = ({ 
  rightToolbar: RightToolbarComponent = EmptyRightToolbar, 
  rightToolbarProps = {},
  ...props 
}) => {

  const navigate = useNavigate();
  const location = useLocation();

  // スマートフォン表示かどうかを判定する（utils/deviceUtil の共通判定）
  const isMobile = useIsMobile();
  // メニュー名のマップ（ルート名 → 自身／親のメニュー名）
  const [menuTitles, setMenuTitles] = React.useState<MenuTitleMaps>({ current: {}, parent: {} });

  React.useEffect(() => {
    let active = true;
    loadMenuItems().then((items) => {
      if (!active) return;
      const titleMaps: MenuTitleMaps = { current: {}, parent: {} };
      // parentTitle には「直上の親メニュー名」を引き継ぐ（親が無ければ自身の名前を使う）
      const walk = (list: MenuItem[], parentTitle?: string) => {
        list.forEach((item) => {
          const ownTitle = item.meta?.title;
          if (ownTitle) {
            titleMaps.current[item.name] = ownTitle;
            titleMaps.parent[item.name] = parentTitle || ownTitle;
          }
          if (item.children) {
            walk(item.children, ownTitle || parentTitle);
          }
        });
      };
      walk(items);
      setMenuTitles(titleMaps);
    });
    return () => {
      active = false;
    };
  }, []);

  // 現在表示中の画面に対応するメニュー名を取得する
  const routeName = location.pathname.replace(/^\/+/, '').split('/')[0];
  const currentMenuTitle = menuTitles.current[routeName];
  // スマートフォンではシステム名ではなく、表示中の画面が属する親メニュー名を表示する
  const mobileMenuTitle = menuTitles.parent[routeName] || currentMenuTitle;
  const appTitle = isMobile && mobileMenuTitle ? mobileMenuTitle : APP_TITLE;

  // システム名（ロゴ）をクリックしたときは初期表示画面へ戻る
  const navigateHome = () =>{
    navigate(HOME_ROUTE)
  }

  const icon = themeIcon === 'S' ? SIcon : themeIcon === 'D' ? DIcon : customIcon

  return (
    <AppBar {...props} userMenu={false} toolbar={null} sx={AppBarSx.baseAppBarSx} >
      <AppBarContainer>
        {/* 左側セクション（ロゴ + タイトル） */}
        <LeftSection sx={{ minWidth: 0 }}>
          <Box
            component="img"
            src={icon}
            alt="customIcon"
            sx={{
              ...hideLogoBelowSmSx,
              // 縮小時にロゴが潰れないよう、伸縮させない
              flexShrink: 0,
              margin: '5px',
              height: FLUID.logoHeight,
              width: 'auto',
            }}
          />
          <Typography
              variant='h6'
              component="h3"
              gutterBottom
              onClick={()=> navigateHome()}
              sx={{
                color: 'black',
                cursor: 'pointer',
                // 文字は折り返さず、幅に応じて少しずつ縮める（極端に狭い場合のみ省略記号）
                fontSize: isMobile ? FLUID.mobileTitleFont : FLUID.titleFont,
                // スマートフォンの副題は太字にし、下寄りに置いて画面名と揃える
                fontWeight: isMobile ? 700 : undefined,
                lineHeight: isMobile ? 1.1 : undefined,
                marginBottom: isMobile ? '0px' : undefined,
                position: isMobile ? 'relative' : undefined,
                top: isMobile ? '3px' : undefined,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
          >
              {appTitle}
          </Typography>
        </LeftSection>

        {/* 右側ツールバー（メッセージ/通知/メニュー） */}
        <RightToolbarComponent {...rightToolbarProps} />
        <RightSection/>
      </AppBarContainer>
    </AppBar>
  );
};

export default CustomAppBar;