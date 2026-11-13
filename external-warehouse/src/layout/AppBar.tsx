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
  'P305',
  'N008',
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
  const validMenus = menus
    .filter((menu) => menu.menuType !== 'F' && menu.status !== '1' && menu.visible !== '1')
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
    fetchAdminMenus()
      .then((menus) => {
        const children = buildMenuItems(menus);
        if (children.length === 0) return;
        setMenuItems((prev) => [...prev, ...children]);
      })
      .catch(() => {
        // 管理メニューが取得できない場合は既存メニューのみ表示する
      });
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