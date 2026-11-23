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

/** パンくずの 1 項目。path が無い項目はディレクトリで、遷移しない */
interface MenuTrailItem {
  title: string;
  path?: string;
}

/** 子を持たない画面だけ遷移先にする（ディレクトリは画面が無い） */
const screenPathOf = (item: MenuTrailNode): string | undefined => {
  if (item.children && item.children.length > 0) return undefined;
  if (!item.name || item.name.includes('/')) return undefined;
  return `/${item.name}`;
};

/** 表示中の画面までのメニュー階層を、根から順に返す */
const findMenuTrail = (items: MenuTrailNode[], routeName: string): MenuTrailItem[] => {
  const walk = (list: MenuTrailNode[]): MenuTrailItem[] | null => {
    for (const item of list) {
      const title = item.meta?.title;
      if (item.name === routeName) {
        return title ? [{ title, path: screenPathOf(item) }] : [];
      }
      if (item.children) {
        const nested = walk(item.children);
        if (nested) {
          return title ? [{ title, path: screenPathOf(item) }, ...nested] : nested;
        }
      }
    }
    return null;
  };
  return walk(items) || [];
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

/** メニューに無い詳細画面が、どのメニュー画面から開かれるか */
const SCREEN_PARENT: Record<string, string> = {
  P010: 'P008',
  P305: 'P304',
  P404: 'P403',
  P405: 'P403',
  P407: 'P403',
  P502: 'P501',
  P503: 'P501',
  P602: 'P601',
  P603: 'P601',
};

/** 直前に表示していたメニュー階層（詳細画面へ進んでも消さない） */
const TRAIL_ANCHOR_KEY = 'ewMenuTrailAnchor';

interface TrailAnchor {
  parentTitle: string;
  trail: MenuTrailItem[];
}

const readTrailAnchor = (): TrailAnchor | null => {
  try {
    const raw = sessionStorage.getItem(TRAIL_ANCHOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrailAnchor;
    if (!parsed || !Array.isArray(parsed.trail)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeTrailAnchor = (anchor: TrailAnchor) => {
  try {
    sessionStorage.setItem(TRAIL_ANCHOR_KEY, JSON.stringify(anchor));
  } catch {
    // 保存できない場合は画面内の状態だけ使う
  }
};

/** メニューに無い画面は、直前の階層の末尾に画面名を足す */
const trailWithCurrentScreen = (anchor: TrailAnchor | null, routeName: string): MenuTrailItem[] => {
  if (!anchor || anchor.trail.length === 0) return [];
  const title = SCREEN_TITLES[routeName];
  if (!title || anchor.trail.some((item) => item.title === title)) return anchor.trail;
  return [...anchor.trail, { title }];
};

/** パスから画面 ID を取り出す（クエリは含めない） */
const routeNameOf = (pathname: string): string => pathname.replace(/^\/+/, '').split('/')[0].split('?')[0];

/**
 * 表示中の画面に対応するメニュー階層と、AppBar に出す親メニュー名を求める
 */
export const useMenuTrail = (menuTree: MenuTrailNode[], menuTitles: MenuTitleMaps) => {
  const location = useLocation();
  const routeName = routeNameOf(location.pathname);
  const currentMenuTitle = menuTitles.current[routeName];
  const mobileMenuTitle = menuTitles.parent[routeName] || currentMenuTitle;
  const menuTrail = React.useMemo(() => findMenuTrail(menuTree, routeName), [menuTree, routeName]);
  const [trailAnchor, setTrailAnchor] = React.useState<TrailAnchor | null>(() => readTrailAnchor());

  React.useEffect(() => {
    if (menuTrail.length === 0) return;
    const next: TrailAnchor = {
      parentTitle: menuTitles.parent[routeName] || menuTitles.current[routeName] || '',
      trail: menuTrail,
    };
    setTrailAnchor(next);
    writeTrailAnchor(next);
  }, [menuTrail, menuTitles, routeName]);

  const isHome = routeName === 'P001' || routeName === '';
  const parentRoute = SCREEN_PARENT[routeName];
  const parentMenuTrail = React.useMemo(
    () => (parentRoute ? findMenuTrail(menuTree, parentRoute) : []),
    [menuTree, parentRoute]
  );
  const visibleTrail = isHome
    ? []
    : menuTrail.length > 0
          ? menuTrail
          : parentMenuTrail.length > 0
      ? trailWithCurrentScreen({ parentTitle: '', trail: parentMenuTrail }, routeName)
      : trailWithCurrentScreen(trailAnchor, routeName);
  const parentMenuTitle = parentRoute
    ? menuTitles.parent[parentRoute] || menuTitles.current[parentRoute]
    : '';
  const headerTitle = mobileMenuTitle || parentMenuTitle || (visibleTrail.length > 0 ? trailAnchor?.parentTitle : '') || '';

  return { routeName, visibleTrail, headerTitle };
};

/** AppBar の直下に出すメニュー階層（メニュー > 親 > 画面）。PC だけ表示する */
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
