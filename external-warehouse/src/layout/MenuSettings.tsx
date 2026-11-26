import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  Box,
  Divider,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import { choiceGroupRowSx } from '../styles/commonSX';
import {
  ThemeType,
  THEME_OPTIONS,
  THEME_CACHE_KEY,
  applyThemeVars,
  resolveInitialTheme,
  FontSizeType,
  FONT_SIZE_OPTIONS,
  FONT_SIZE_CACHE_KEY,
  applyFontSize,
  resolveInitialFontSize,
  resolveInitialMenuDock,
  saveMenuDock,
} from '../styles/themeVars';

interface MenuSettingsButtonProps {
  /** 右側固定の現在値（メニュー本体と同期する） */
  docked: boolean;
  /** 右側固定の変更をメニュー本体へ通知する */
  onDockChange: (docked: boolean) => void;
}

/**
 * メニュー右上の歯車アイコンと設定ダイアログ。
 * スタイル（青・灰・茶）、フォントサイズ（小・中・大）、右側固定（はい・いいえ）を
 * ラジオボタンで選び、localStorage に保存する。
 */
export const MenuSettingsButton: React.FC<MenuSettingsButtonProps> = ({ docked, onDockChange }) => {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeType>(resolveInitialTheme);
  const [fontSize, setFontSize] = useState<FontSizeType>(resolveInitialFontSize);
  const [dock, setDock] = useState<boolean>(docked);

  // ダイアログを開いたときに最新値を読み直す
  const handleOpen = () => {
    setTheme(resolveInitialTheme());
    setFontSize(resolveInitialFontSize());
    setDock(docked);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  // 選択したら即時反映し、localStorage にも保存する
  const handleThemeChange = (value: ThemeType) => {
    setTheme(value);
    applyThemeVars(value);
    try {
      localStorage.setItem(THEME_CACHE_KEY, value);
    } catch {
      // 保存できない場合でも表示は切り替える
    }
  };

  const handleFontChange = (value: FontSizeType) => {
    setFontSize(value);
    applyFontSize(value);
    try {
      localStorage.setItem(FONT_SIZE_CACHE_KEY, value);
    } catch {
      // 保存できない場合でも表示は切り替える
    }
  };

  const handleDockChange = (value: boolean) => {
    setDock(value);
    saveMenuDock(value);
    onDockChange(value);
  };

  return (
    <>
      <IconButton onClick={handleOpen} aria-label="設定" sx={{ color: 'black' }}>
        <SettingsIcon />
      </IconButton>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'var(--mui-page-header-color)',
            color: 'white',
            py: 1.5,
          }}
        >
          <Box component="span" sx={{ fontSize: '16px', fontWeight: 600 }}>
            設定
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ color: 'white' }} aria-label="閉じる">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* スタイル（青・灰・茶） */}
          <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
            <FormLabel component="legend" sx={{ fontSize: '14px', fontWeight: 600, mb: 0.5, color: '#333' }}>
              スタイル
            </FormLabel>
            <RadioGroup
              row
              sx={choiceGroupRowSx}
              value={theme}
              onChange={(event) => handleThemeChange(event.target.value as ThemeType)}
            >
              {THEME_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size="small" />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <Divider />

          {/* フォントサイズ（小・中・大） */}
          <FormControl component="fieldset" fullWidth sx={{ my: 2 }}>
            <FormLabel component="legend" sx={{ fontSize: '14px', fontWeight: 600, mb: 0.5, color: '#333' }}>
              フォントサイズ
            </FormLabel>
            <RadioGroup
              row
              sx={choiceGroupRowSx}
              value={fontSize}
              onChange={(event) => handleFontChange(event.target.value as FontSizeType)}
            >
              {FONT_SIZE_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size="small" />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <Divider />

          {/* 右側固定（はい・いいえ） */}
          <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
            <FormLabel component="legend" sx={{ fontSize: '14px', fontWeight: 600, mb: 0.5, color: '#333' }}>
              メニューを右側に固定
            </FormLabel>
            <RadioGroup
              row
              sx={choiceGroupRowSx}
              value={dock ? 'yes' : 'no'}
              onChange={(event) => handleDockChange(event.target.value === 'yes')}
            >
              <FormControlLabel value="yes" control={<Radio size="small" />} label="はい" />
              <FormControlLabel value="no" control={<Radio size="small" />} label="いいえ" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              bgcolor: 'var(--mui-page-header-color)',
              '&:hover': { bgcolor: 'var(--mui-page-header-color)', opacity: 0.85 },
            }}
          >
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MenuSettingsButton;
