/**
 * 画面共通のテーマ色（青／灰／茶）の定義と CSS 変数への反映
 *
 * 画面上部の ThemeToggel から切り替えるほか、ログイン画面のように AppBar が無い
 * 画面では既定テーマを自前で適用する（未定義だと var(--mui-page-header-color) を
 * 参照しているボタン背景色などが無効になる）。
 * 茶は指定画像の色 #897067。
 */
export type ThemeType = 'blue' | 'gray' | 'brown';

export interface ThemeConfig {
  'card-header-color': string;
  'page-header-color': string;
  'back-button-color': string;
  'text-primary': string;
  'divider': string;
}

export const themeStyles: Record<ThemeType, ThemeConfig> = {
  blue: {
    'card-header-color': '#CCE5FF',
    'page-header-color': '#1A73E8',
    'back-button-color': '#6f9fd0',
    'text-primary': '#204080',
    'divider': '#B3D0FF',
  },
  gray: {
    'card-header-color': '#E4E4E4',
    'page-header-color': '#6E6E6E',
    'back-button-color': '#B0B0B0',
    'text-primary': '#333333',
    'divider': '#D0D0D0',
  },
  brown: {
    'card-header-color': '#E8DDD6',
    'page-header-color': '#897067',
    'back-button-color': '#C4B2A6',
    'text-primary': '#4A3C34',
    'divider': '#D9CFC6',
  },
};

export const THEME_OPTIONS: { value: ThemeType; label: string }[] = [
  { value: 'blue', label: '青' },
  { value: 'gray', label: '灰' },
  { value: 'brown', label: '茶' },
];

export const THEME_CACHE_KEY = 'theme-config';

// 保存済みの選択を優先し、無い場合は環境変数、それ以外は青
export const resolveInitialTheme = (): ThemeType => {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached && cached in themeStyles) return cached as ThemeType;
  } catch {
    // 保存を読めない場合は環境変数へ進む
  }
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

/* ------------------------------------------------------------------ */
/* フォントサイズ（小・中・大）                                            */
/* ------------------------------------------------------------------ */
export type FontSizeType = 'small' | 'medium' | 'large';

export const FONT_SIZE_OPTIONS: { value: FontSizeType; label: string; zoom: number }[] = [
  { value: 'small', label: '小', zoom: 0.9 },
  { value: 'medium', label: '中', zoom: 1 },
  { value: 'large', label: '大', zoom: 1.1 },
];

export const FONT_SIZE_CACHE_KEY = 'font-size-config';

// フォントサイズは body の zoom で拡縮する（px 指定の既存画面にも効くようにする）
export const applyFontSize = (size: FontSizeType) => {
  const option = FONT_SIZE_OPTIONS.find((o) => o.value === size) || FONT_SIZE_OPTIONS[1];
  if (typeof document !== 'undefined' && document.body) {
    (document.body.style as unknown as { zoom: string }).zoom = String(option.zoom);
  }
};

export const resolveInitialFontSize = (): FontSizeType => {
  try {
    const cached = localStorage.getItem(FONT_SIZE_CACHE_KEY);
    if (cached && FONT_SIZE_OPTIONS.some((o) => o.value === cached)) return cached as FontSizeType;
  } catch {
    // 読み取れない場合は既定の「中」
  }
  return 'medium';
};

/* ------------------------------------------------------------------ */
/* メニューの右側固定（はい・いいえ）                                       */
/* ------------------------------------------------------------------ */
export const MENU_DOCK_CACHE_KEY = 'menu-dock-config';

export const resolveInitialMenuDock = (): boolean => {
  try {
    return localStorage.getItem(MENU_DOCK_CACHE_KEY) === '1';
  } catch {
    return false;
  }
};

export const saveMenuDock = (docked: boolean) => {
  try {
    localStorage.setItem(MENU_DOCK_CACHE_KEY, docked ? '1' : '0');
  } catch {
    // 保存できなくても動作は継続する
  }
};
