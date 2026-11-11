import * as React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    MenuItemLink,
} from 'react-admin';

import { useLocation } from 'react-router';

// メニューコンテナスタイル
const MenuContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(1, 3),
    minHeight: '56px',
    backgroundColor: 'white', 
}));

// コンポーネントプロップス型定義
interface MenuConfigProps {
    buttons: Array<MenuButtonConfig>,
    sx?: any,
}

// メニューボタン設定型定義
interface MenuButtonConfig {
    to: string,
    primaryText: string, 
}

// カスタムメニューコンポーネント
const CustomMenu: React.FC<MenuConfigProps> = (({buttons, sx})=>{
    return (
        <MenuContainer className= 'menu-container' sx={{sx}}>
        {buttons.map((button) => {
            // 現在のルート情報取得
            const location = useLocation();

            // アクティブ判定：現在のパスがメニューパスで始まるか
            const isActive = location.pathname.startsWith(button.to);

            return (
                <MenuItemLink 
                key={button.to}
                to={`/${button.to}`}
                primaryText={button.primaryText}
                selected={isActive}
                className='nemu-link-button' 
                />
        )})}
        </MenuContainer>
    );
})

export default CustomMenu;