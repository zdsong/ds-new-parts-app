import React, { useState, useEffect } from 'react';
import { SimpleForm } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';

// メニュー情報の型定義
interface MenuData {
    id: string;
    menuId: string;
    menuName: string;
    parentId: string;
    parentName?: string;
    orderNum: string;
    path: string;
    component: string;
    query: string;
    routeName: string;
    isFrame: string;
    isCache: string;
    menuType: string;
    visible: string;
    status: string;
    perms: string;
    icon: string;
    remark: string;
    createTime?: string;
    updateTime?: string;
    children?: MenuData[];
}

// 表示用の行データ
interface DisplayRow {
    node: MenuData;
    depth: number;
}

// 検索条件の型定義
interface SearchForm {
    menuName: string;
    status: string;
}

// 種別タグのスタイル
const typeTagStyle = (menuType: string) => {
    if (menuType === 'M') {
        return { color: '#1677ff', backgroundColor: '#e6f4ff', border: '1px solid #91caff' };
    }
    if (menuType === 'F') {
        return { color: '#d46b08', backgroundColor: '#fff7e6', border: '1px solid #ffd591' };
    }
    return { color: '#389e0d', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' };
};

// 種別名称を取得する
const getMenuTypeName = (menuType: string) => {
    if (menuType === 'M') return 'ディレクトリ';
    if (menuType === 'F') return 'ボタン';
    return 'メニュー';
};

const S050: React.FC = () => {
    const [treeData, setTreeData] = useState<MenuData[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [searchForm, setSearchForm] = useState<SearchForm>({ menuName: '', status: '' });
    const [orderEdits, setOrderEdits] = useState<Record<string, string>>({});
    const [deleteTarget, setDeleteTarget] = useState<MenuData | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sysJobStatus, setSysJobStatus] = useState<Array<{ key: string; value: string }>>([]);
    const navigate = useNavigate();
    const { request } = useApiRequest();

    // フラットなメニュー一覧からツリー構造を構築する
    const buildTree = (list: MenuData[]): MenuData[] => {
        const nodeMap = new Map<string, MenuData>();
        list.forEach((item) => {
            nodeMap.set(String(item.menuId), { ...item, children: [] });
        });

        const roots: MenuData[] = [];
        nodeMap.forEach((node) => {
            const parent = nodeMap.get(String(node.parentId));
            if (String(node.parentId) === '0' || !parent) {
                roots.push(node);
            } else {
                parent.children!.push(node);
            }
        });

        const sortNodes = (nodes: MenuData[]) => {
            nodes.sort((a, b) => {
                const orderDiff = Number(a.orderNum || 0) - Number(b.orderNum || 0);
                if (orderDiff !== 0) return orderDiff;
                // メニューID は 19 桁の雪花IDを含むため Number 変換せず文字列で比較する
                return String(a.menuId).localeCompare(String(b.menuId));
            });
            nodes.forEach((node) => sortNodes(node.children || []));
        };
        sortNodes(roots);
        return roots;
    };

    // 検索条件に合わせてツリーを絞り込む（親ノードは子ノードが一致した場合に残す）
    const filterTree = (nodes: MenuData[], keyword: string, status: string): MenuData[] => {
        const result: MenuData[] = [];
        nodes.forEach((node) => {
            const children = filterTree(node.children || [], keyword, status);
            const nameMatched = !keyword || node.menuName.includes(keyword);
            const statusMatched = !status || String(node.status) === status;
            if ((nameMatched && statusMatched) || children.length > 0) {
                result.push({ ...node, children });
            }
        });
        return result;
    };

    // 展開状態を考慮して表示行を生成する
    const flattenTree = (nodes: MenuData[], depth = 0): DisplayRow[] => {
        const rows: DisplayRow[] = [];
        nodes.forEach((node) => {
            rows.push({ node, depth });
            const children = node.children || [];
            if (children.length > 0 && expandedKeys.has(String(node.menuId))) {
                rows.push(...flattenTree(children, depth + 1));
            }
        });
        return rows;
    };

    // メニュー一覧を取得する
    const fetchMenuList = async () => {
        try {
            const response = await request('get', 'api/system/menu/list', {}, {}, false, false);
            if (response && response.code === 200) {
                const rows = response.data || response.rows || [];
                setTreeData(buildTree(rows));
            }
        } catch (error) {
            // エラーはAPI共通処理で通知される
        }
    };

    // 全ノードのIDを取得する
    const collectAllIds = (nodes: MenuData[]): string[] => {
        let ids: string[] = [];
        nodes.forEach((node) => {
            ids.push(String(node.menuId));
            ids = ids.concat(collectAllIds(node.children || []));
        });
        return ids;
    };

    const handleSearch = (data: any) => {
        setSearchForm({
            menuName: data.menuName || '',
            status: data.status || '',
        });
    };

    const handleReset = () => {
        setSearchForm({ menuName: '', status: '' });
    };

    const handleAdd = () => {
        navigate('S051');
    };

    // 子メニューを追加する
    const handleAddChild = (node: MenuData) => {
        navigate('S051', {
            state: {
                parentId: String(node.menuId),
                parentMenuType: node.menuType,
            },
        });
    };

    const handleEdit = (node: MenuData) => {
        navigate('S051', { state: { menuData: node, isEdit: true } });
    };

    const handleDeleteClick = (node: MenuData) => {
        setDeleteTarget(node);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        handleCloseDeleteDialog();
        try {
            await request('delete', `api/system/menu/${target.menuId}`, {}, {}, true, true);
            fetchMenuList();
        } catch (error) {
            // エラーはAPI共通処理で通知される
        }
    };

    // 展開・折りたたみを切り替える
    const handleToggleExpandAll = () => {
        const visibleTree = filterTree(treeData, searchForm.menuName, searchForm.status);
        const allIds = collectAllIds(visibleTree);
        if (expandedKeys.size > 0) {
            setExpandedKeys(new Set());
        } else {
            setExpandedKeys(new Set(allIds));
        }
    };

    const handleToggleNode = (menuId: string) => {
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(menuId)) {
                next.delete(menuId);
            } else {
                next.add(menuId);
            }
            return next;
        });
    };

    // 表示順序の変更を保持する
    const handleOrderChange = (menuId: string, value: string) => {
        setOrderEdits((prev) => ({ ...prev, [menuId]: value }));
    };

    // 変更された表示順序を保存する
    const handleSaveOrder = async () => {
        const entries = Object.entries(orderEdits);
        if (entries.length === 0) return;
        try {
            for (const [menuId, orderNum] of entries) {
                const node = findNode(treeData, menuId);
                if (!node) continue;
                await request('put', 'api/system/menu', {
                    ...node,
                    children: undefined,
                    orderNum: Number(orderNum),
                }, {}, false, false);
            }
            setOrderEdits({});
            await fetchMenuList();
        } catch (error) {
            // エラーはAPI共通処理で通知される
        }
    };

    // ツリーから指定IDのノードを検索する
    const findNode = (nodes: MenuData[], menuId: string): MenuData | null => {
        for (const node of nodes) {
            if (String(node.menuId) === String(menuId)) return node;
            const found = findNode(node.children || [], menuId);
            if (found) return found;
        }
        return null;
    };

    useEffect(() => {
        fetchMenuList();
    }, []);

    useEffect(() => {
        const fetchCommonCode = async () => {
            try {
                const sysJobStatusData = await request(
                    'post',
                    'api/common/options',
                    { cmdOptionName: 'sys_job_status' },
                    {},
                    false,
                    false
                );
                setSysJobStatus(sysJobStatusData.data || []);
            } catch (error) {
                // エラーはAPI共通処理で通知される
            }
        };
        fetchCommonCode();
    }, []);

    const visibleTree = filterTree(treeData, searchForm.menuName, searchForm.status);
    const displayRows = flattenTree(visibleTree);

    // セルスタイル
    const headCellStyle: React.CSSProperties = {
        fontWeight: 600,
        backgroundColor: '#fafafa',
        borderBottom: '1px solid #e8e8e8',
        padding: '10px 12px',
        fontSize: '13px',
        color: '#333',
    };
    const bodyCellStyle: React.CSSProperties = {
        borderBottom: '1px solid #f0f0f0',
        padding: '8px 12px',
        fontSize: '13px',
        color: '#333',
    };

    return (
        <PageContainer title={'メニュー管理'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="検索条件" border={false}>
                <SimpleForm
                    sx={formSx.formContainer}
                    onSubmit={handleSearch}
                    toolbar={false}
                    defaultValues={searchForm}
                    values={searchForm}
                >
                    <div style={formSx.form1}>
                        <FormInput
                            type={'text'}
                            source="menuName"
                            label="メニュー名"
                            placeholder="メニュー名を入力してください"
                        />
                        <FormInput
                            type={'filter-select'}
                            source="status"
                            label="ステータス"
                            choices={sysJobStatus}
                        />
                        <div></div>
                        <div style={buttonSx.buttonBar}>
                            <button style={buttonSx.button} type="submit" onClick={fetchMenuList}>
                                検索
                            </button>
                            <button style={buttonSx.button} type="button" onClick={handleReset}>
                                リセット
                            </button>
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            <CustomCard sx={{ width: '100%', marginTop: 2 }} titleVariant={'body1'} title="メニュー一覧" border={false}>
                <div style={buttonSx.buttonBar}>
                    <button style={buttonSx.button} type="button" onClick={handleAdd}>
                        新規
                    </button>
                    <button style={buttonSx.button} type="button" onClick={handleSaveOrder}>
                        表示順序を保存
                    </button>
                    <button style={buttonSx.button} type="button" onClick={handleToggleExpandAll}>
                        {expandedKeys.size > 0 ? '折りたたむ' : '展開する'}
                    </button>
                </div>

                <TableContainer sx={{ width: '100%', marginTop: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...headCellStyle, width: '24%' }}>メニュー名</TableCell>
                                <TableCell sx={{ ...headCellStyle, width: '10%' }}>種別</TableCell>
                                <TableCell sx={{ ...headCellStyle, width: '10%' }}>表示順</TableCell>
                                <TableCell sx={{ ...headCellStyle, width: '18%' }}>権限文字列</TableCell>
                                <TableCell sx={{ ...headCellStyle, width: '18%' }}>コンポーネントパス</TableCell>
                                <TableCell sx={{ ...headCellStyle, width: '8%' }}>ステータス</TableCell>
                                <TableCell sx={{ ...headCellStyle, width: '12%' }}>操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayRows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ ...bodyCellStyle, textAlign: 'center', color: '#999' }}>
                                        該当するデータはありません。
                                    </TableCell>
                                </TableRow>
                            )}
                            {displayRows.map(({ node, depth }) => {
                                const hasChildren = (node.children || []).length > 0;
                                const isExpanded = expandedKeys.has(String(node.menuId));
                                return (
                                    <TableRow key={node.menuId} hover>
                                        <TableCell sx={bodyCellStyle}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', paddingLeft: `${depth * 20}px` }}>
                                                {hasChildren ? (
                                                    <IconButton
                                                        size="small"
                                                        sx={{ padding: '2px', marginRight: '4px' }}
                                                        onClick={() => handleToggleNode(String(node.menuId))}
                                                    >
                                                        {isExpanded ? (
                                                            <ExpandMoreIcon fontSize="small" />
                                                        ) : (
                                                            <ChevronRightIcon fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                ) : (
                                                    <Box sx={{ width: '28px', display: 'inline-block' }} />
                                                )}
                                                <Typography variant="body2" sx={{ fontSize: '13px' }}>
                                                    {node.menuName}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={bodyCellStyle}>
                                            <span
                                                style={{
                                                    ...typeTagStyle(node.menuType),
                                                    padding: '1px 6px',
                                                    borderRadius: '2px',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                {getMenuTypeName(node.menuType)}
                                            </span>
                                        </TableCell>
                                        <TableCell sx={bodyCellStyle}>
                                            <input
                                                type="number"
                                                value={orderEdits[String(node.menuId)] ?? String(node.orderNum ?? '0')}
                                                onChange={(e) => handleOrderChange(String(node.menuId), e.target.value)}
                                                style={{
                                                    width: '70px',
                                                    padding: '2px 4px',
                                                    border: '1px solid #d9d9d9',
                                                    borderRadius: '2px',
                                                    fontSize: '13px',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ ...bodyCellStyle, color: '#666' }}>{node.perms || ''}</TableCell>
                                        <TableCell sx={{ ...bodyCellStyle, color: '#666' }}>{node.component || ''}</TableCell>
                                        <TableCell sx={bodyCellStyle}>
                                            <span
                                                style={{
                                                    color: String(node.status) === '0' ? '#1677ff' : '#f5222d',
                                                    backgroundColor: String(node.status) === '0' ? '#e6f4ff' : '#fff1f0',
                                                    border: `1px solid ${String(node.status) === '0' ? '#91caff' : '#ffa39e'}`,
                                                    padding: '1px 6px',
                                                    borderRadius: '2px',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                {String(node.status) === '0' ? '正常' : '停止'}
                                            </span>
                                        </TableCell>
                                        <TableCell sx={bodyCellStyle}>
                                            <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span
                                                    style={{ color: '#1677ff', cursor: 'pointer' }}
                                                    onClick={() => handleEdit(node)}
                                                >
                                                    修正
                                                </span>
                                                {node.menuType !== 'F' && (
                                                    <span
                                                        style={{ color: '#1677ff', cursor: 'pointer' }}
                                                        onClick={() => handleAddChild(node)}
                                                    >
                                                        追加
                                                    </span>
                                                )}
                                                <span
                                                    style={{ color: '#ff4d4f', cursor: 'pointer' }}
                                                    onClick={() => handleDeleteClick(node)}
                                                >
                                                    削除
                                                </span>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Dialog
                    open={deleteDialogOpen}
                    onClose={handleCloseDeleteDialog}
                    aria-labelledby="delete-confirm-dialog-title"
                    aria-describedby="delete-confirm-dialog-description"
                >
                    <DialogTitle id="delete-confirm-dialog-title">削除の確認</DialogTitle>
                    <DialogContent>
                        <DialogContentText id="delete-confirm-dialog-description">
                            選択したメニューを削除しますか？
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog} color="primary">
                            キャンセル
                        </Button>
                        <Button onClick={handleConfirmDelete} color="primary" autoFocus>
                            確定
                        </Button>
                    </DialogActions>
                </Dialog>
            </CustomCard>
        </PageContainer>
    );
};

export default S050;
