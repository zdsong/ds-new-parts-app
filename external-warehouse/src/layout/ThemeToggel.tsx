import React, { useEffect, useState } from 'react';
import { Box, FormControl, MenuItem, Select } from '@mui/material';
import {
  THEME_CACHE_KEY,
  THEME_OPTIONS,
  ThemeType,
  applyThemeVars,
  resolveInitialTheme,
  themeStyles,
} from '../styles/themeVars';

// 画面最上部で、青・灰・茶の共通スタイルを選ぶ
const ThemeToggle: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(resolveInitialTheme);

  const changeTheme = (theme: ThemeType) => {
    setCurrentTheme(theme);
    applyThemeVars(theme);
    try {
      localStorage.setItem(THEME_CACHE_KEY, theme);
    } catch {
      // 保存できない場合でも、表示中の色は切り替える
    }
  };

  useEffect(() => {
    applyThemeVars(currentTheme);
  }, [currentTheme]);

  return (
    <FormControl size="small" sx={{ minWidth: 92, mr: 1, justifyContent: 'center' }}>
      <Select
        value={currentTheme}
        onChange={(event) => changeTheme(event.target.value as ThemeType)}
        aria-label="スタイル"
        sx={{
          height: 28,
          fontSize: 13,
          backgroundColor: '#fff',
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            py: 0,
          },
        }}
      >
        {THEME_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value} sx={{ fontSize: 13, gap: '6px' }}>
            <Box
              component="span"
              sx={{
                width: 14,
                height: 14,
                borderRadius: '2px',
                backgroundColor: themeStyles[option.value]['page-header-color'],
                border: '1px solid rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            />
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ThemeToggle;
