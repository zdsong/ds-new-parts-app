import React, { useEffect, useRef, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify, useTranslate } from 'react-admin';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    MenuItem,
    Modal,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery
} from '@mui/material';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import DataGrid from '../compontent/DataGrid';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import deleteIcon from '../assets/icons/delete-icon.png';

/**
 * ロケ番一覧画面（P601）
 *
 * 画面イメージ：⑤ロケ番マスタ 1. ロケーション番号を検索する
 * 倉庫・ロケ番を条件にロケーションマスタを検索し、一覧表示する。
 */

/** ロケーションマスタの一覧行 */
interface LocationRow {
    id: string;
    whCd: string;
    whNm: string;
    locCd: string;
    memo: string;
    version: number;
}

/** 検索条件 */
interface SearchForm {
    whCd: string;
    locCd: string;
}

/** コンボボックスの選択肢 */
interface OptionItem {
    key: string;
    value: string;
}

/** 表示件数の選択肢 */
const PAGE_SIZE_CHOICES = [10, 20, 50];

/**
 * 選択値を文字列に正規化する
 * （選択コンポーネントは選択肢オブジェクトを返す場合があるため）
 */
const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

const P601: React.FC = () => {
    const navigate = useNavigate();
    const { request } = useApiRequest();
    const isNarrow = useMediaQuery('(max-width: 900px)');

    // 検索結果
    const [rows, setRows] = useState<LocationRow[]>([]);
    const [total, setTotal] = useState<number>(0);
    // ページング
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    // 検索条件とフォーム再描画用の世代番号
    const [searchForm, setSearchForm] = useState<SearchForm>({ whCd: '', locCd: '' });
    const [formVersion, setFormVersion] = useState<number>(0);
    // 再検索用のキー
    const [refreshKey, setRefreshKey] = useState<number>(0);
    // 倉庫コンボボックス
    const [warehouseChoices, setWarehouseChoices] = useState<OptionItem[]>([]);
    // 削除対象
    const [deleteTarget, setDeleteTarget] = useState<LocationRow | null>(null);
    // インポート関連
    const [importFile, setImportFile] = useState<File | null>(null);
    const [filePath, setFilePath] = useState<string>('');
    const [importErrorList, setImportErrorList] = useState<any[]>([]);
    const [importErrorOpen, setImportErrorOpen] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const notify = useNotify();
    const translate = useTranslate();

    /** 倉庫コンボボックスを取得する */
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const response = await request('get', 'api/common/wh/options', {}, {}, false, false);
                setWarehouseChoices(response?.data || []);
            } catch (error) {
                setWarehouseChoices([]);
            }
        };
        fetchWarehouses();
    }, []);

    /** ロケーションマスタ一覧を取得する */
    useEffect(() => {
        const fetchList = async () => {
            try {
                const response = await request('get', 'api/master/location/list', {
                    ...searchForm,
                    pageNum,
                    pageSize,
                });
                if (response?.code === 200) {
                    const list: LocationRow[] = (response.rows || []).map((item: any) => ({
                        ...item,
                        id: String(item.id),
                        whNm: item.whNm || '',
                        locCd: item.locCd || '',
                        memo: item.memo || '',
                        version: item.version,
                    }));
                    setRows(list);
                    setTotal(response.total || 0);
                }
            } catch (error) {
                setRows([]);
                setTotal(0);
            }
        };
        fetchList();
    }, [pageNum, pageSize, searchForm, refreshKey]);

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        setSearchForm({
            whCd: normalizeChoiceValue(values?.whCd),
            locCd: (values?.locCd || '').trim(),
        });
        setPageNum(1);
        setRefreshKey((key) => key + 1);
    };

    /** 検索条件をクリアする */
    const handleClear = () => {
        setSearchForm({ whCd: '', locCd: '' });
        setPageNum(1);
        setFormVersion((version) => version + 1);
        setRefreshKey((key) => key + 1);
    };

    /** ページ変更処理 */
    const handlePageChange = (current: number, size: number) => {
        setPageNum(current || 1);
        setPageSize(size || 10);
    };

    /** 削除を確定する */
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const response = await request('post', 'api/master/location/delete', {
                id: deleteTarget.id,
                version: deleteTarget.version,
            });
            setDeleteTarget(null);
            if (response?.code >= 200 && response?.code < 300) {
                // 最終ページの最後の1件を削除した場合は前のページへ戻す
                if (rows.length === 1 && pageNum > 1) {
                    setPageNum(pageNum - 1);
                } else {
                    setRefreshKey((key) => key + 1);
                }
            }
        } catch (error) {
            setDeleteTarget(null);
        }
    };

    /** インポート対象ファイルを選択する */
    const handleSelectImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        if (!file.name.toLowerCase().endsWith('.csv')) {
            notify(translate('ra.message.csv_not_select'), { type: 'error', raw: true });
            event.target.value = '';
            setImportFile(null);
            setFilePath('');
            return;
        }
        setImportFile(file);
        setFilePath(file.name);
    };

    /** インポートを実行する */
    const handleImport = async () => {
        if (!importFile) {
            notify(translate('ra.message.csv_not_select'), { type: 'error', raw: true });
            return;
        }
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            const result = await request('post', 'api/master/location/import', formData, {}, true, false);

            if (result?.errorList && result.errorList.length > 0) {
                setImportErrorList(result.errorList);
                setImportErrorOpen(true);
                notify(translate('ra.message.import_failed'), { type: 'error' });
                return;
            }

            if (result?.code >= 200 && result?.code < 300) {
                setImportFile(null);
                setFilePath('');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setRefreshKey((key) => key + 1);
            }
        } catch (error) {
            // エラー通知は API 呼び出し側で表示する
        }
    };

    /** 表示範囲の開始位置 */
    const startRow = total === 0 ? 0 : (pageNum - 1) * pageSize + 1;
    /** 表示範囲の終了位置 */
    const endRow = Math.min(pageNum * pageSize, total);

    const columnDefs: ColDef<LocationRow>[] = [
        { headerName: '倉庫', field: 'whNm', flex: 1, minWidth: 140 },
        {
            headerName: 'ロケ番',
            field: 'locCd',
            flex: 1,
            minWidth: 160,
            // 一覧のロケ番リンクから更新画面へ遷移する
            cellRenderer: (params: any) => (
                <span
                    style={tableSx.linkFontColumn as React.CSSProperties}
                    onClick={() => navigate('/P603', { state: { id: params.data.id } })}
                >
                    {params.value}
                </span>
            ),
        },
        { headerName: 'コメント', field: 'memo', flex: 2, minWidth: 200 },
        {
            headerName: '操作',
            width: 150,
            cellStyle: { justifyContent: 'center' },
            cellRenderer: (params: any) => (
                <div style={{ display: 'flex', gap: '14px' }}>
                    <span
                        style={tableSx.linkFontColumn as React.CSSProperties}
                        onClick={() => navigate('/P603', { state: { id: params.data.id } })}
                    >
                        編集
                    </span>
                    <span
                        style={tableSx.linkFontColumn as React.CSSProperties}
                        onClick={() => setDeleteTarget(params.data)}
                    >
                        削除
                    </span>
                </div>
            ),
        },
    ];

    return (
        <PageContainer title={'ロケ番一覧'}>
            {/* 検索条件 */}
            <CustomCard
                sx={{ width: '100%' }}
                titleVariant={'body1'}
                title="検索条件"
                border={false}
                action={
                    <button
                        style={{ ...buttonSx.button, marginRight: '10px' }}
                        type="button"
                        onClick={() => navigate('/P602')}
                    >
                        新規追加
                    </button>
                }
            >
                <SimpleForm
                    key={formVersion}
                    sx={formSx.formContainer}
                    onSubmit={handleSearch}
                    toolbar={false}
                    defaultValues={searchForm}
                >
                    <div
                        style={{
                            ...formSx.form1,
                            gridTemplateColumns: isNarrow ? '1fr' : '5fr 5fr',
                        }}
                    >
                        <FormInput
                            type={'filter-select'}
                            source="whCd"
                            label="倉庫"
                            choices={warehouseChoices}
                            placeholder="選択してください"
                        />
                        <FormInput
                            type={'text'}
                            source="locCd"
                            label="ロケ番"
                            placeholder="入力してください"
                        />
                        <div style={buttonSx.buttonBar}>
                            <button style={buttonSx.button} type="button" onClick={handleClear}>
                                クリア
                            </button>
                            <button style={buttonSx.button} type="submit">
                                検索
                            </button>
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            {/* 一括登録エリア（N008と同じ配置） */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', gap: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>一括登録</span>
                <input
                    type="text"
                    placeholder="ファイルパス"
                    value={filePath}
                    readOnly
                    style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', width: '25%' }}
                />
                <button
                    style={{ padding: '5px 10px', border: 'none', color: 'var(--mui-page-header-color)' }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    ファイル選択
                </button>
                <button
                    style={{
                        padding: '5px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: filePath ? 'pointer' : 'not-allowed',
                    }}
                    disabled={!filePath}
                    onClick={() => {
                        setFilePath('');
                        setImportFile(null);
                        // ファイル入力をリセット
                        if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                        }
                    }}
                >
                    <img src={deleteIcon} alt="deleteIcon" style={{ height: '20px', marginRight: '3px' }} />
                </button>
                <button style={{ ...buttonSx.button, width: '150px' }} type="button" onClick={() => handleImport()}>
                    インポート実行
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleSelectImportFile}
                />
            </div>

            {/* 検索結果一覧 */}
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="検索結果一覧" border={false}>
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        margin: '5px 0 8px 0',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>表示件</span>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                            <Select
                                value={pageSize}
                                onChange={(event) => {
                                    setPageSize(Number(event.target.value));
                                    setPageNum(1);
                                }}
                            >
                                {PAGE_SIZE_CHOICES.map((size) => (
                                    <MenuItem key={size} value={size}>
                                        {size}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <span>件</span>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>{`検索結果：${total}件`}</span>
                        <span>{`${startRow} - ${endRow}件を表示`}</span>
                    </Box>
                </Box>

                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<LocationRow>
                        columnDefs={columnDefs}
                        rowData={rows}
                        rowTotal={total}
                        pagination
                        page={pageNum}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        rowUniqueKey="id"
                        selectionMode="none"
                        rowHeight={38}
                        noRowsShow="該当するロケ番がありません。"
                    />
                </div>
            </CustomCard>

            {/* 操作ボタン */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
                <button style={buttonSx.button} type="button" onClick={() => navigate(-1)}>
                    戻る
                </button>
            </div>

            {/* 削除確認ダイアログ */}
            <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>削除の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {`ロケ番「${deleteTarget?.locCd || ''}」を削除しますか？`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} color="primary">
                        キャンセル
                    </Button>
                    <Button onClick={handleConfirmDelete} color="primary" autoFocus>
                        確定
                    </Button>
                </DialogActions>
            </Dialog>

            {/* インポートエラー情報（N008と同じ表示） */}
            <Modal
                open={importErrorOpen}
                onClose={() => setImportErrorOpen(false)}
                aria-labelledby="error-modal-title"
                aria-describedby="error-modal-description"
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 1000,
                        maxHeight: '80vh',
                        overflow: 'auto',
                        bgcolor: 'background.paper',
                        border: '2px solid #000',
                        boxShadow: 24,
                        p: 4,
                    }}
                >
                    <Typography id="error-modal-title" variant="h6" component="h2" sx={{ mb: 2, textAlign: 'center' }}>
                        {'インポートエラー情報（' + importErrorList.length + '）'}
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table
                            sx={{
                                minWidth: 650,
                                '& .MuiTableCell-root': {
                                    borderRight: '1px solid rgba(224, 224, 224, 1)',
                                    '&:last-child': {
                                        borderRight: 0,
                                    },
                                },
                            }}
                            aria-label="error table"
                        >
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'var(--mui-page-header-color)' }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ファイル</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '170px' }}>
                                        行目（ヘッダ含め）
                                    </TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>エラーメッセージ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {importErrorList.map((error, index) => (
                                    <TableRow
                                        key={index}
                                        sx={{
                                            '&:last-child td, &:last-child th': { borderBottom: 0 },
                                            backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white',
                                        }}
                                    >
                                        <TableCell component="th" scope="row">
                                            {error.objectName}
                                        </TableCell>
                                        <TableCell>{error.rowLine}</TableCell>
                                        <TableCell>{error.message}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Modal>
        </PageContainer>
    );
};

export default P601;
