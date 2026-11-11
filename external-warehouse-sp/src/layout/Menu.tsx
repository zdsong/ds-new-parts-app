import React, { useState, useRef } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Collapse, Box, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Logout from '@mui/icons-material/Logout';
import { useLogout } from 'react-admin';
import { useNavigate } from 'react-router'
import { usePopupControl } from './usePopupMutex';
import Close from '@mui/icons-material/Close';

// スタイル定義
const sxStyles = {
  container: {
    position: 'relative',
    display: 'inline-block' as const,
  },
  iconButton: {
    ml: 1,
    color: 'black',
  },
  popup: {
    right: 0,
    left: 'auto',
    flex: 1,
    marginTop: '50px',
    minWidth: 250,
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: 3,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
  },
  parentMenuItem: {
    px: 2,
    height: '50px',
    justifyContent: 'space-between',
    '&:hover': { bgcolor: 'action.hover' },
  },
  childMenuItem: {
    px: 3,
    '&:hover': { bgcolor: 'action.hover' },
  },
  rootMenuItem: {
    px: 2,
    '&:hover': { bgcolor: 'action.hover' },
    borderBottom: '1px solid rgba(0,0,0,0.12)',
    height: '50px'
  },
  arrowIcon: {
    transition: 'transform 0.2s ease',
  },
  menuContent: {
    flex: 1,
  },
  divider: {
    my: 0.5,
  },
  logoutMenuItem: {
    px: 2,
    height: '50px',
    '&:hover': { bgcolor: 'action.hover' },
    mt: 'auto',
  },
};

// 型定義
interface MenuItemType {
  name: string;
  meta: any;
  icon?:any;
  children?: MenuItemType[];
}

interface MenuConfigProps {
  menuItems: Array<any>,
  sx?: any,
}

// ログアウトメニューアイテム
const logoutMenuItem: MenuItemType = {
  name: 'logout',
  meta: { title: 'ログアウト' },
  icon: <Logout fontSize="small" />,
};

// メニューアイテムの再帰的レンダリング
const renderMenuItems = (
  items: MenuItemType[],
  onClose: () => void,
  navigate: (path: string) => void,
  isRootLevel = true
) => {
  return items.map((item) => {
    // 子メニューが存在する場合
    if (item.children && item.children.length > 0) {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <React.Fragment key={item.name}>
          <MenuItem
            onClick={() => setIsOpen(!isOpen)}
            sx={sxStyles.parentMenuItem}
          >
            <div style={{ display: 'flex', alignItems: 'center'}}>
              {item.icon}
              <ListItemText primary={item.meta.title} sx={{ ml: 1 }} />
            </div>
            {isRootLevel && (
              <ChevronRight
                fontSize="small"
                sx={{ ...sxStyles.arrowIcon, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
            )}
          </MenuItem>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            {renderMenuItems(item.children!, onClose, navigate, false)}
          </Collapse>
        </React.Fragment>
      );
    }
    // 子メニューが存在しない場合
    return (
      <MenuItem
        key={item.name}
        onClick={() => {
          item.name && navigate(`/${item.name}`);
          onClose();
        }}
        sx={isRootLevel ? sxStyles.rootMenuItem : sxStyles.childMenuItem}
      >
        {item.icon}
        <ListItemText primary={item.meta.title} sx={{ ml: 1 }} />
      </MenuItem>
    );
  });
};

// カスタムAppBarメニューコンポーネント
export const CustomAppBarMenu: React.FC<MenuConfigProps> = ({menuItems}) => {
  const navigate = useNavigate();
  const logout = useLogout();
  const menuRef = useRef<HTMLDivElement>(null);
  const { activePopup, setActivePopup, closeAllPopups } = usePopupControl();
  const isMenuOpen = activePopup === 'menu';

  // メニューの開閉処理
  const handleToggleMenu = () => {
    if (isMenuOpen) {
      closeAllPopups();
    } else {
      closeAllPopups();
      setActivePopup('menu');
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    logout();
    closeAllPopups();
  };

  return (
    <Box sx={sxStyles.container}>
      {/* ハンバーガーボタン */}
      <IconButton
        color="inherit"
        onClick={handleToggleMenu}
        aria-label="メインメニュー"
        sx={sxStyles.iconButton}
      >
        <MenuIcon />
      </IconButton>

      {/* メニューポップアップ */}
      <Menu
        open={isMenuOpen}
        onClose={closeAllPopups}
        PaperProps={{
          ref: menuRef,
          sx: sxStyles.popup,
        }}
        anchorReference="none"
        anchorPosition={{ top: 64, left: 0 }}
        disableScrollLock
      >
      <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'end',
            height: '500px'
          }}
        >
          {/* 閉じるボタン */} 
          <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'end',
            height: '30px'
          }}
          >
          <IconButton
              onClick={handleToggleMenu}
          >
              <Close />
          </IconButton>
          </Box>
        {/* メニューコンテンツ */}
        <Box sx={sxStyles.menuContent}>
          {renderMenuItems(menuItems, closeAllPopups, navigate)}
        </Box>
        <Divider sx={sxStyles.divider} />
        {/* ログアウトメニュー */}
        <MenuItem
          onClick={handleLogout}
          sx={sxStyles.logoutMenuItem}
        >
          {logoutMenuItem.icon}
          <ListItemText primary={logoutMenuItem.meta.title} sx={{ ml: 1 }} />
        </MenuItem>
        </Box>
      </Menu>
    </Box>
  );
};