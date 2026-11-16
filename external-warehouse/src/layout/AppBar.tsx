import * as React from 'react';
import { AppBar, AppBarProps } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { CustomAppBarMenu } from './Menu';
import { MessageChatAppBar } from './MessageChat'

import { AppBarSx } from '../styles/layoutSx';
import customIcon from '../assets/icons/logo-icon.png';
import { useNavigate } from 'react-router';
import { Notice } from './Notice';
import ThemeToggle from './ThemeToggel';
import LoginUserInfoBar from './LoginUserInfo';
import { fetchAdminMenus, AdminMenu } from '../admin/adminApi';

import SIcon from '../assets/icons/S.png';
import DIcon from '../assets/icons/D.png';
const themeIcon  = import.meta.env.VITE_THEME_ICON;

interface MenuItem {
  name: string,
  hidden?: boolean,
  component?: string,
  path?: string,
  meta: any,
  children?: MenuItem[],
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
  'N008',
  'P401',
  'P403',
  'P404',
  'P405',
  'P406',
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
    {/* ログインユーザー情報（ID・最終ログイン・ログアウト） */}
    <LoginUserInfoBar />
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

  const navigateS050 = () =>{
    navigate('/S050')
  }

  const icon = themeIcon === 'S' ? SIcon : themeIcon === 'D' ? DIcon : customIcon

  return (
    <AppBar {...props} userMenu={false} toolbar={null} sx={AppBarSx.baseAppBarSx} >
      <AppBarContainer>
        {/* 左側セクション（ロゴ + タイトル） */}
        <LeftSection>
          <img src={icon} alt="customIcon" style={{
            margin: '5px',
            height: '40px'
          }}/>
          <Typography 
              variant='h6'
              component="h3" 
              gutterBottom
              style={{ color: 'black', cursor: 'pointer' }}
              onClick={()=> navigateS050()}
          >
              新部品管理システム｜外部倉庫管理
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