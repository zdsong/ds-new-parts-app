import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { AdminMenu, fetchAdminMenus, fetchMenuData, menuEndpointMap } from './adminApi';

// 値の表示用フォーマット
const formatValue = (value: any) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// 管理メニュー画面
const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menus, setMenus] = useState<AdminMenu[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<any>(null);

  // 現在のメニューパスを取得する
  const currentPath = useMemo(() => {
    const raw = location.pathname.replace(/^\/admin\/?/, '');
    return raw;
  }, [location.pathname]);

  // メニュー一覧の初期読み込み
  useEffect(() => {
    let active = true;
    fetchAdminMenus()
      .then((items) => {
        if (!active) return;
        setMenus(items);
        setLoadingMenus(false);
      })
      .catch(() => {
        if (!active) return;
        setError('メニュー情報の取得に失敗しました。');
        setLoadingMenus(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // 現在のメニューデータ読み込み
  useEffect(() => {
    if (!currentPath) {
      setData(null);
      return;
    }
    const config = menuEndpointMap[currentPath];
    if (!config) {
      setData(null);
      setError(`メニュー「${currentPath}」の取得先が定義されていません。`);
      return;
    }
    let active = true;
    setLoadingData(true);
    setError('');
    fetchMenuData(config.endpoint)
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoadingData(false);
      })
      .catch(() => {
        if (!active) return;
        setError('データの取得に失敗しました。');
        setLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [currentPath]);

  const currentMenu = menus.find((menu) => menu.path === currentPath);
  const config = menuEndpointMap[currentPath];
  const rows: any[] = Array.isArray(data) ? data : [];
  const columns = config?.columns && config.columns.length > 0
    ? config.columns
    : rows.length > 0
      ? Object.keys(rows[0]).map((key) => ({ key, label: key }))
      : [];

  // バージョン情報の単一オブジェクト表示
  const singleObject = data && !Array.isArray(data) && typeof data === 'object' ? data : null;

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      <Paper square sx={{ width: 260, height: '100%', overflow: 'auto' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">管理メニュー</Typography>
          <Typography variant="caption" color="text.secondary">
            システムメニュー一覧
          </Typography>
        </Box>
        <Divider />
        {loadingMenus ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <List dense>
            {menus.map((menu) => {
              const selected = currentPath === menu.path;
              return (
                <ListItemButton
                  key={menu.menuId}
                  selected={selected}
                  onClick={() => navigate(`/admin/${menu.path}`)}
                  sx={{ pl: menu.menuType === 'M' ? 2 : 3 }}
                >
                  <ListItemText
                    primary={menu.menuName}
                    secondary={menu.path}
                    primaryTypographyProps={{ fontWeight: selected ? 700 : 400 }}
                  />
                  {menu.menuType === 'M' && <Chip size="small" label="M" />}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Paper>

      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <Typography variant="h5">{currentMenu?.menuName || '管理メニュー'}</Typography>
          {currentPath && <Chip size="small" label={currentPath} />}
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {loadingData ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : !currentPath ? (
          <Typography color="text.secondary">左側のメニューを選択してください。</Typography>
        ) : singleObject ? (
          <Paper sx={{ p: 3, maxWidth: 480 }}>
            {Object.entries(singleObject).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">{key}</Typography>
                <Typography>{formatValue(value)}</Typography>
              </Box>
            ))}
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.key}>{column.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(columns.length, 1)} align="center">
                      データがありません。
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={index} hover>
                      {columns.map((column) => (
                        <TableCell key={column.key}>{formatValue(row[column.key])}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default AdminPage;
