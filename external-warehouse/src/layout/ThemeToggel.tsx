import React, { useState, useEffect } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import { ThemeType, applyThemeVars, resolveInitialTheme, THEME_CACHE_KEY } from '../styles/themeVars';

const ThemeToggle: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(resolveInitialTheme);


  const changeTheme = (theme: ThemeType) => {
    setCurrentTheme(theme);
    setAnchorEl(null);
    applyThemeVars(theme);
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