/**
 * テーマ色（緑／青／紫）の定義と CSS 変数への反映
 *
 * AppBar の ThemeToggel から切り替えるほか、ログイン画面のように AppBar が無い
 * 画面では既定テーマを自前で適用する（未定義だと var(--mui-page-header-color) を
 * 参照しているボタン背景色などが無効になる）。
 */
export type ThemeType = 'green' | 'blue' | 'purple';

export interface ThemeConfig {
  'card-header-color': string;
  'page-header-color': string;
  'text-primary': string;
  'divider': string;
}

export const themeStyles: Record<ThemeType, ThemeConfig> = {
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

export const THEME_CACHE_KEY = 'theme-config';

// 環境変数から初期テーマを決める（未定義・不正な値は blue）
export const resolveInitialTheme = (): ThemeType => {
  const value = import.meta.env.VITE_THEME_COLOR;
  return value && value in themeStyles ? (value as ThemeType) : 'blue';
};

// テーマ色を CSS 変数として <html> に反映する
export const applyThemeVars = (theme: ThemeType) => {
  const root = document.documentElement;
  Object.entries(themeStyles[theme]).forEach(([key, value]) => {
    root.style.setProperty(`--mui-${key}`, value);
  });
};
