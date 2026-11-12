import React, { useState, useEffect } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
// 環境変数が未設定の場合は既定テーマ（blue）を使用する
const themeColor = import.meta.env.VITE_THEME_COLOR;

type ThemeType = 'green' | 'blue' | 'purple';
interface ThemeConfig {
  'card-header-color': string;
  'page-header-color': string;
  'text-primary': string;
  'divider': string;
}

const themeStyles: Record<ThemeType, ThemeConfig> = {
  green: {
    'card-header-color': '#D4F4CD',
    'page-header-color': '#02B441',
    'text-primary': '#2D3748',
    'divider': '#E2E8F0',
  },
  blue: {
    'card-header-color': '#CCE5FF',
    'page-header-color': '#1A73E8',
    'text-primary': '#204080',
    'divider': '#B3D0FF',
  },
  purple: {
    'card-header-color': '#DCC7E0',
    'page-header-color': '#3D3E7C',
    'text-primary': '#204080',
    'divider': '#B3D0FF',
  }
};

const THEME_CACHE_KEY = 'theme-config';

const ThemeToggle: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // 未定義または不正なテーマ値の場合は blue にフォールバックする
  const initialTheme: ThemeType =
    themeColor && themeColor in themeStyles ? (themeColor as ThemeType) : 'blue';
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(initialTheme);


  const changeTheme = (theme: ThemeType) => {
    setCurrentTheme(theme);
    setAnchorEl(null);
    const root = document.documentElement;
    Object.entries(themeStyles[theme]).forEach(([key, value]) => {
      root.style.setProperty(`--mui-${key}`, value);
    });
    localStorage.setItem(THEME_CACHE_KEY, theme);
  };

  useEffect(() => {
    changeTheme(currentTheme);
  }, []);

  return (
    <div style={{display: 'none', alignItems: 'center'}}>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
        <PaletteIcon sx= {{color: '#808080'}} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        sx={{ '& .MuiMenuItem-root': { minHeight: '36px' } }}
      >
        <MenuItem 
          onClick={() => changeTheme('green')}
          sx={{ bgcolor: currentTheme === 'green' ? '#D4F4CD' : 'transparent' }}
        >
          緑
        </MenuItem>
        <MenuItem 
          onClick={() => changeTheme('blue')}
          sx={{ bgcolor: currentTheme === 'blue' ? '#CCE5FF' : 'transparent' }}
        >
          青
        </MenuItem>
        <MenuItem 
          onClick={() => changeTheme('purple')}
          sx={{ bgcolor: currentTheme === 'purple' ? '#8C31AA' : 'transparent' }}
        >
          紫
        </MenuItem>
      </Menu>
    </div>
  );
};

export default ThemeToggle;