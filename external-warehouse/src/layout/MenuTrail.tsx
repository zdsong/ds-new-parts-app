import * as React from 'react';
import { Box } from '@mui/material';
import { useLocation, useNavigate } from 'react-router';

import { HOME_ROUTE } from '../utils/appRoutes';
import { useIsMobile } from '../utils/deviceUtil';

/** メニュー階層の 1 ノード（AppBar が組み立てたメニュー） */
export interface MenuTrailNode {
  name: string;
  meta?: { title?: string };
  children?: MenuTrailNode[];
}

/** ルート名ごとのメニュー名 */
export interface MenuTitleMaps {
  current: Record<string, string>;
  parent: Record<string, string>;
}

/** パンくずの 1 項目 */
interface MenuTrailItem {
  title: string;
  path?: string;
}

/** メニューから開いた画面。この画面をパンくずの起点にする */
const MENU_ENTRY_KEY = 'ewMenuTrailEntry';

/** 実際に遷移した画面の順（親子メニューは含まない） */
const TRAIL_STEPS_KEY = 'ewMenuTrailSteps';

interface TrailStep {
  screenId: string;
  path: string;
}

/** メニュー項目をクリックしたときに呼ぶ。次の画面をパンくずの先頭にする */
export const markMenuTrailEntry = (routeName: string) => {
  try {
    sessionStorage.setItem(MENU_ENTRY_KEY, routeName);
    window.dispatchEvent(new Event('ew-menu-entry'));
  } catch {
    // 保存できない場合は遷移後の追記だけ行う
  }
};

const readSteps = (): TrailStep[] => {
  try {
    const raw = sessionStorage.getItem(TRAIL_STEPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrailStep[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((step) => step && step.screenId && step.path);
  } catch {
    return [];
  }
};

const writeSteps = (steps: TrailStep[]) => {
  try {
    sessionStorage.setItem(TRAIL_STEPS_KEY, JSON.stringify(steps));
  } catch {
    // 保存できない場合は画面内の状態だけ使う
  }
};

/** パスから画面 ID を取り出す。詳細ルートは末尾の画面 ID を使う */
const screenIdOf = (pathname: string): string => {
  const parts = pathname.split('/').filter(Boolean);
  const coded = [...parts].reverse().find((part) => /^[A-Za-z]+[0-9]+$/.test(part));
  return coded || parts[0] || '';
};

const isHomePath = (pathname: string): boolean => {
  const screenId = screenIdOf(pathname);
  return screenId === '' || screenId === 'P001';
};

/** メニュー起点ならパンくずをその画面だけにし、画面内遷移なら末尾へ足す */
const nextSteps = (pathname: string, previous: TrailStep[], entry: string): TrailStep[] => {
  if (isHomePath(pathname)) return [];
  const screenId = screenIdOf(pathname);
  const step: TrailStep = { screenId, path: pathname };
  if (entry && (entry === screenId || pathname === `/${entry}` || pathname.startsWith(`/${entry}/`))) {
    return [step];
  }
  const index = previous.findIndex((item) => item.screenId === screenId);
  if (index >= 0) {
    return [...previous.slice(0, index), step];
  }
  return [...previous, step];
};

/**
 * メニューに無い詳細画面の名前。
 * 在庫一覧から在庫詳細へ進んだ場合など、メニュー項目が無い画面でも階層を残す。
 */
const SCREEN_TITLES: Record<string, string> = {
  P010: '品目詳細',
  P305: 'パレット情報詳細',
  P404: '移動依頼（出庫）詳細',
  P405: '移動依頼（入庫）詳細',
  P407: '移動情報詳細',
  P502: '在庫詳細（品目）',
  P503: '在庫詳細（ロケ番）',
  P602: 'ロケ番新規登録',
  P603: 'ロケ番更新',
};

/** パスの先頭セグメント（AppBar の見出し用） */
const routeNameOf = (pathname: string): string => pathname.replace(/^\/+/, '').split('/')[0].split('?')[0];

const readMenuEntry = (): string => {
  try {
    return sessionStorage.getItem(MENU_ENTRY_KEY) || '';
  } catch {
    return '';
  }
};

const clearMenuEntry = () => {
  try {
    sessionStorage.removeItem(MENU_ENTRY_KEY);
  } catch {
    // 削除できない場合は次の遷移で上書きされる
  }
};

/**
 * 表示中の画面までの遷移順と、AppBar に出すメニュー名を求める。
 * 親メニューは出さず、メニューから開いた画面を起点に、画面内の遷移を後ろへ足す。
 */
export const useMenuTrail = (_menuTree: MenuTrailNode[], menuTitles: MenuTitleMaps) => {
  const location = useLocation();
  const routeName = routeNameOf(location.pathname);
  const screenId = screenIdOf(location.pathname);
  const currentMenuTitle = menuTitles.current[screenId] || menuTitles.current[routeName];
  const mobileMenuTitle = menuTitles.parent[screenId] || menuTitles.parent[routeName] || currentMenuTitle;
  const [steps, setSteps] = React.useState<TrailStep[]>(readSteps);

  const applyPath = React.useCallback((pathname: string) => {
    const entry = readMenuEntry();
    if (entry) clearMenuEntry();
    setSteps((previous) => {
      const next = nextSteps(pathname, previous, entry);
      writeSteps(next);
      return next;
    });
  }, []);

  React.useEffect(() => {
    applyPath(location.pathname);
  }, [location.pathname, location.key, applyPath]);

  React.useEffect(() => {
    const onEntry = () => {
      const entry = readMenuEntry();
      const currentId = screenIdOf(location.pathname);
      if (!entry || (entry !== currentId && location.pathname !== `/${entry}`)) return;
      applyPath(location.pathname);
    };
    window.addEventListener('ew-menu-entry', onEntry);
    return () => window.removeEventListener('ew-menu-entry', onEntry);
  }, [location.pathname, applyPath]);

  // 画面 ID そのものは出さない。メニュー名が無い画面は、メニューから入ったときの親メニュー名を引き継ぐ
  const titleOf = (id: string) => menuTitles.current[id] || SCREEN_TITLES[id] || '';
  const parentOf = (id: string) => menuTitles.parent[id] || '';
  const trailParent = steps.map((step) => parentOf(step.screenId)).find((title) => title !== '') || '';
  const visibleTrail: MenuTrailItem[] = isHomePath(location.pathname)
    ? []
    : steps
        .map((step) => ({ title: titleOf(step.screenId), path: step.path }))
        .filter((item) => item.title !== '');
  const headerTitle = isHomePath(location.pathname)
    ? ''
    : parentOf(screenId) || parentOf(routeName) || mobileMenuTitle || trailParent || currentMenuTitle || '';

  return { routeName, visibleTrail, headerTitle };
};

/** AppBar の直下に出すメニュー階層（メニュー > 遷移した画面）。PC だけ表示する */
const MenuTrail: React.FC<{ trail: MenuTrailItem[] }> = ({ trail }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const routeName = routeNameOf(location.pathname);

  if (isMobile || routeName.startsWith('SP') || trail.length === 0) return null;

  const items: MenuTrailItem[] = [{ title: 'メニュー', path: HOME_ROUTE }, ...trail];
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: '6px',
        px: '36px',
        pt: '10px',
        pb: '2px',
        backgroundColor: '#ffffff',
        fontSize: '14px',
        lineHeight: 1.4,
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={`${item.title}-${index}`}>
          {index > 0 && (
            <Box component="span" sx={{ color: '#1976d2' }}>
              {'>'}
            </Box>
          )}
          {item.path ? (
            <Box
              component="button"
              type="button"
              onClick={() => navigate(item.path as string)}
              sx={{
                border: 'none',
                background: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                color: '#1976d2',
              }}
            >
              {item.title}
            </Box>
          ) : (
            <Box component="span" sx={{ color: '#1976d2' }}>
              {item.title}
            </Box>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
};

export default MenuTrail;
