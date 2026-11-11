import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, IconButton, List, ListItem, ListItemText, Divider, Box, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useMediaQuery, Theme } from '@mui/material';
import Logout from '@mui/icons-material/Logout';
import { useLogout } from 'react-admin';

// サイドバーメニューアイテムの型定義（React Adminルーティングと互換）
export type SidebarMenuItem = {
  name: string; 
  meta: {
    title: string; 
  };
  path?: string; 
  children?: SidebarMenuItem[];
};

// サイドバーメニューコンポーネントのプロパティ型定義
interface SidebarMenuProps {
  menuItems: SidebarMenuItem[]; // メニューデータ
  sx?: object; // カスタムスタイル
}

// CRMシステム用サイドバーメニューコンポーネント（レスポンシブ対応）
const SidebarMenu: React.FC<SidebarMenuProps> = ({ menuItems, sx = {} }) => {
  // ドロワーの開閉状態管理
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  // モバイルデバイス判定（スマートフォンサイズ以下）
  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));

  // ドロワーの開閉切り替えハンドラ
  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  // メニューアイテムクリック時のルーティング遷移処理
  const handleMenuItemClick = (item: SidebarMenuItem) => {
    // nameをパスとして使用（pathプロパティが存在する場合は優先可）
    const targetPath = `/${item.name}`;
    setDrawerOpen(false)
    navigate(targetPath);
    // モバイル端末の場合はクリック後にドロワーを閉じる
    if (isMobile) setDrawerOpen(false);
  };

  const logout = useLogout();

  // 単層メニューのレンダリング（再帰的にサブメニューに対応）
  const renderMenuList = (items: SidebarMenuItem[]) => (
    <List sx={{flex: 1}}>
      {items.map((item) => (
        <React.Fragment key={item.name}>
          <ListItem 
            onClick={() => handleMenuItemClick(item)}
            sx={{
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-selected': { backgroundColor: '#e3f2fd' },
              cursor: 'pointer'
            }}
          >
            <ListItemText primary={item.meta.title} />
          </ListItem>
          {/* サブメニューのレンダリング（多階層メニューに拡張可能） */}
          {item.children && renderMenuList(item.children)}
        </React.Fragment>
      ))}
    </List>
  );

  // ドロワー内のコンテンツ定義
  const drawerContent = (
    <Box sx={{ width: 240, display: 'flex', flexDirection:'column', flex: 1, ...sx }} role="presentation">
      {/* メニューヘッダー */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', }}>
        <Typography variant="h6" sx={{ color: '#1976d2' }}>
          メニュー
        </Typography>
      </Box>

      {/* メニューリスト本体 */}
      {renderMenuList(menuItems)}

      <Divider sx={{ mt: 2 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', paddingLeft: '10px', marginBottom: '20px', '&:hover': { bgcolor: 'action.hover' }}} onClick={()=>{logout()}}>
        <Logout fontSize="small" />
        <ListItemText primary={'ログアウト'} sx={{ ml: 1 }} />
      </Box>
    </Box>
  );

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="メニューを開く"
        onClick={toggleDrawer(true)}
        sx={{
          color: 'black'
        }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 240,
            boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
            borderLeft: 'none',
            borderRight: '1px solid rgba(0,0,0,0.12)',
            display: 'flex'
          }
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default SidebarMenu;