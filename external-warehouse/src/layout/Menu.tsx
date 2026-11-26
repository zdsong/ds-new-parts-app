import React, { useEffect, useState, useRef } from 'react';
import { IconButton, Menu, MenuItem, ListItemText, Collapse, Box, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Logout from '@mui/icons-material/Logout';
import { useLogout } from 'react-admin';
import { useNavigate } from 'react-router'
import { usePopupControl } from './usePopupMutex';
import { markMenuTrailEntry } from './MenuTrail';
import Close from '@mui/icons-material/Close';
import { MenuSettingsButton } from './MenuSettings';
import { resolveInitialMenuDock, saveMenuDock } from '../styles/themeVars';

// スタイル定義（集中管理）
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
    // ブラウザの下部ツールバーに隠れないよう、--app-vh（モバイルでは dvh）を基準にする
    maxHeight: 'calc(var(--app-vh) * 0.9)',
    overflow: 'hidden',
    boxShadow: 3,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
  },
  // 親メニュー（ディレクトリ）。子と区別するため背景と太字にする
  parentMenuItem: {
    px: 2,
    height: '46px',
    justifyContent: 'space-between',
    backgroundColor: '#e7eef8',
    borderBottom: '1px solid #d3deee',
    '& .MuiListItemText-primary': {
      fontWeight: 700,
      fontSize: '15px',
      color: '#1a2b42',
    },
    '&:hover': { backgroundColor: '#dbe6f4' },
  },
  // 子メニュー（画面）。親より字下げし、リンク色で遷移できることを示す
  childMenuItem: {
    pl: 3.5,
    pr: 2,
    height: '40px',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #eef2f6',
    '& .MuiListItemText-primary': {
      fontWeight: 400,
      fontSize: '14px',
      color: 'var(--mui-page-header-color)',
    },
    '&:hover': { backgroundColor: '#f3f8ff' },
  },
  // 展開した子メニューのまとまり
  childGroup: {
    backgroundColor: '#f7fafc',
    borderLeft: '3px solid var(--mui-page-header-color)',
    marginLeft: '12px',
    marginBottom: '4px',
  },
  rootMenuItem: {
    px: 2,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e4e4e4',
    height: '46px',
    justifyContent: 'space-between',
    '& .MuiListItemText-primary': {
      fontWeight: 500,
      fontSize: '15px',
      color: 'var(--mui-page-header-color)',
    },
    '&:hover': { backgroundColor: '#f3f8ff' },
  },
  arrowIcon: {
    transition: 'transform 0.2s ease',
    color: 'rgba(0,0,0,0.54)',
  },
  menuContent: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    '&::-webkit-scrollbar': { width: '8px' },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: '4px',
    },
  },
  divider: {
    my: 0.5,
  },
  logoutMenuItem: {
    px: 2,
    height: '50px',
    justifyContent: 'space-between',
    '&:hover': { bgcolor: 'action.hover' },
    mt: 'auto',
  },
  // 右側へ固定したときのパネル
  dockPanel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '280px',
    height: 'var(--app-vh)',
    backgroundColor: '#ffffff',
    borderLeft: '1px solid #d3deee',
    boxShadow: 3,
    zIndex: 1200,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
};

// 右側固定時に本文へ空ける幅
const DOCK_WIDTH = '280px';

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

// 指定名がこの項目自身、または配下にあるか
const menuContains = (item: MenuItemType, name: string): boolean => {
  if (!name) return false;
  if (item.name === name) return true;
  return (item.children || []).some((child) => menuContains(child, name));
};

// メニューの1項目を描画する
const MenuNode: React.FC<{
  item: MenuItemType;
  onClose: () => void;
  navigate: (path: string) => void;
  isRootLevel: boolean;
  depth: number;
  expandName: string;
  openName: string | null;
  onToggle: (name: string) => void;
}> = ({ item, onClose, navigate, isRootLevel, depth, expandName, openName, onToggle }) => {
  // 同じ階層では 1 つだけ開く（アコーディオン動作）
  const isOpen = openName === item.name;

  // 子メニューが存在する場合は親メニューとして展開する
  if (item.children && item.children.length > 0) {
    return (
      <>
        <MenuItem
          onClick={() => onToggle(item.name)}
          sx={{ ...sxStyles.parentMenuItem, pl: 2 + depth * 1.5 }}
        >
          <div style={{ display: 'flex', alignItems: 'center'}}>
            {item.icon}
            <ListItemText primary={item.meta.title} sx={{ ml: 1 }} />
          </div>
          <ChevronRight
            fontSize="small"
            sx={{ ...sxStyles.arrowIcon, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--mui-page-header-color)' }}
          />
        </MenuItem>
        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <Box sx={sxStyles.childGroup}>
            <RecursiveMenuItems
              items={item.children}
              onClose={onClose}
              navigate={navigate}
              isRootLevel={false}
              depth={depth + 1}
              expandName={expandName}
            />
          </Box>
        </Collapse>
      </>
    );
  }

  // 子メニューが存在しない場合
  const isDirectory = item.meta?.menuType === 'M';
  return (
    <MenuItem
      onClick={() => {
        // ディレクトリは展開専用のため画面遷移しない
        if (!isDirectory && item.name) {
          // メニューから開いた画面は、パンくずの起点にする
          markMenuTrailEntry(item.name);
          navigate(`/${item.name}`);
        }
        onClose();
      }}
      sx={isRootLevel ? sxStyles.rootMenuItem : { ...sxStyles.childMenuItem, pl: 3.5 + (depth - 1) * 1.5 }}
    >
      <div style={{ display: 'flex', alignItems: 'center'}}>
        {item.icon}
        <ListItemText primary={item.meta.title} sx={{ ml: 1 }} />
      </div>
    </MenuItem>
  );
};

// メニューアイテムの再帰的レンダリング
const RecursiveMenuItems: React.FC<{
  items: MenuItemType[];
  onClose: () => void;
  navigate: (path: string) => void;
  isRootLevel?: boolean;
  depth?: number;
  expandName?: string;
}> = ({ items, onClose, navigate, isRootLevel = true, depth = 0, expandName = '' }) => {
  // 同じ階層で開いている項目名（アコーディオン動作のため 1 つだけ保持）
  // パンくずの親メニューから開いたときは、その経路上の項目を初期展開する
  const initialOpen = React.useMemo(
    () => items.find((item) => !!item.children?.length && menuContains(item, expandName))?.name ?? null,
    [items, expandName],
  );
  const [openName, setOpenName] = useState<string | null>(initialOpen);

  useEffect(() => {
    setOpenName(initialOpen);
  }, [initialOpen]);

  // 同じ項目を再度クリックしたら閉じ、別の項目をクリックしたらそれだけを開く
  const handleToggle = (name: string) => {
    setOpenName((prev) => (prev === name ? null : name));
  };

  return (
    <>
      {items.map((item) => (
        <MenuNode
          key={item.name || item.meta?.title}
          item={item}
          onClose={onClose}
          navigate={navigate}
          isRootLevel={isRootLevel}
          depth={depth}
          expandName={expandName}
          openName={openName}
          onToggle={handleToggle}
        />
      ))}
    </>
  );
};

// ポップアップと右側固定で共通の中身
const MenuPanelBody: React.FC<{
  menuItems: Array<any>;
  navigate: (path: string) => void;
  onClose: () => void;
  expandName: string;
  docked: boolean;
  onSetDocked: (value: boolean) => void;
  onDismiss: () => void;
  onLogout: () => void;
}> = ({ menuItems, navigate, onClose, expandName, docked, onSetDocked, onDismiss, onLogout }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'end',
        maxHeight: docked ? '100%' : 'calc(var(--app-vh) - 30px)',
        height: docked ? '100%' : undefined,
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          height: '36px',
          pl: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MenuSettingsButton docked={docked} onDockChange={onSetDocked} />
          <IconButton onClick={onDismiss} aria-label="メニューを閉じる">
            <Close />
          </IconButton>
        </Box>
      </Box>
      <Box sx={sxStyles.menuContent}>
        <RecursiveMenuItems items={menuItems} onClose={onClose} navigate={navigate} expandName={expandName} />
      </Box>
      <Divider sx={sxStyles.divider} />
      <Box sx={{ display: 'flex', alignItems: 'center', paddingLeft: '10px', height: '50px', '&:hover': { bgcolor: 'action.hover' }}} onClick={onLogout}>
        {logoutMenuItem.icon}
        <ListItemText primary={logoutMenuItem.meta.title} sx={{ ml: 1 }} />
      </Box>
    </Box>
  );
};

// カスタムAppBarメニューコンポーネント
export const CustomAppBarMenu: React.FC<MenuConfigProps> = ({menuItems}) => {
  const navigate = useNavigate();
  const logout = useLogout();
  const menuRef = useRef<HTMLDivElement>(null);
  const { activePopup, setActivePopup, closeAllPopups, PopupParam, setPopupParam } = usePopupControl();
  const isMenuOpen = activePopup === 'menu';
  // 前回保存した右側固定の設定を初期値として使う
  const [docked, setDocked] = useState<boolean>(() => resolveInitialMenuDock());
  // パンくずの親メニューから開いたときは、その項目を展開する
  const expandName = (isMenuOpen || docked) && PopupParam?.expandName ? String(PopupParam.expandName) : '';
  // 右側に固定している間は、項目を選んでも閉じない
  const handleItemClose = () => {
    if (docked) return;
    closeAllPopups();
  };

  // 右側固定とポップアップを切り替える。本文が隠れないよう幅を確保する
  useEffect(() => {
    document.documentElement.style.setProperty('--app-menu-dock', docked ? DOCK_WIDTH : '0px');
    // 一覧の幅を、固定したメニュー分だけ詰め直す
    window.dispatchEvent(new Event('resize'));
    // 設定ダイアログからも変更できるよう、現在値を保存する
    saveMenuDock(docked);
    return () => {
      document.documentElement.style.setProperty('--app-menu-dock', '0px');
    };
  }, [docked]);

  // メニューの開閉処理
  const handleToggleMenu = () => {
    if (docked) {
      setDocked(false);
      closeAllPopups();
      return;
    }
    if (isMenuOpen) {
      closeAllPopups();
      return;
    }
    setPopupParam(null);
    setActivePopup('menu');
  };

  // 固定中はポップアップを閉じ、解除すると固定前のポップアップに戻す
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

      {/* メニューポップアップ。右側固定中は出さない */}
      <Menu
        open={isMenuOpen && !docked}
        onClose={closeAllPopups}
        PaperProps={{
          ref: menuRef,
          sx: sxStyles.popup,
        }}
        anchorReference="none"
        anchorPosition={{ top: 64, left: 0 }}
        disableScrollLock
      >
        <MenuPanelBody
          menuItems={menuItems}
          navigate={navigate}
          onClose={handleItemClose}
          expandName={expandName}
          docked={false}
          onSetDocked={setDocked}
          onDismiss={closeAllPopups}
          onLogout={() => logout()}
        />
      </Menu>
      {docked && (
        <Box sx={sxStyles.dockPanel}>
          <MenuPanelBody
            menuItems={menuItems}
            navigate={navigate}
            onClose={handleItemClose}
            expandName={expandName}
            docked
            onSetDocked={setDocked}
            onDismiss={() => setDocked(false)}
            onLogout={() => logout()}
          />
        </Box>
      )}
    </Box>
  );
};