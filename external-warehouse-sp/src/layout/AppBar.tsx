import * as React from 'react';
import { AppBar, AppBarProps } from 'react-admin';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MessageChatAppBar } from './MessageChat'

import { AppBarSx } from '../styles/layoutSx';
import customIcon from '../assets/icons/logo-icon.png';
import { useNavigate } from 'react-router';
import { Notice } from './Notice';
import SidebarMenu from './LeftMenu';
import ThemeToggle from './ThemeToggel';

import SIcon from '../assets/icons/S.png';
import DIcon from '../assets/icons/D.png';
const themeIcon  = import.meta.env.VITE_THEME_ICON;

interface MenuItem {
  name: string,
  hidden?: boolean,
  component?: string,
  path?: string,
  meta: any,
}

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
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([
    {
      name: 'N006',
      meta: { title: '注文一覧' }
    },
    {
      name: 'N008',
      meta: { title: '商品マスタ' }
    },
    {
      name: 'N015',
      meta: { title: '顧客マスタ' }
    },
  ]);

  return (
  <Box
  sx={{
    display: 'flex',
    flexColumn: 'row',
    flex: 1,
    justifyContent: 'end',
  }}>
    <ThemeToggle></ThemeToggle>
    <MessageChatAppBar></MessageChatAppBar>
    <Notice></Notice>
    <SidebarMenu menuItems={menuItems || []} />
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

  const navigateN006 = () =>{
    navigate('/N006')
  }

  const icon = themeIcon === 'S' ? SIcon : themeIcon === 'D' ? DIcon : customIcon

  return (
    <AppBar {...props} userMenu={false} toolbar={null} sx={AppBarSx.baseAppBarSx} >
      <AppBarContainer>
        {/* 左側セクション（ロゴ + タイトル） */}
        <LeftSection>
          <img src={icon} alt="customIcon" style={{
            margin: '5px',
            height: '30px'
          }}/>
          <label
          style = {{
            height: '30px',
            color: 'black',
            width: '100px',
            cursor: 'pointer'
          }}
          onClick={()=> navigateN006()}
          >
              新 産 直 く ん 
          </label>
        </LeftSection>

        {/* 右側ツールバー（メッセージ/通知/メニュー） */}
        <RightToolbarComponent {...rightToolbarProps} />
        <RightSection/>
      </AppBarContainer>
    </AppBar>
  );
};

export default CustomAppBar;