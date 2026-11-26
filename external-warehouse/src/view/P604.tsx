import React, { useEffect, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm } from 'react-admin';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    useMediaQuery,
} from '@mui/material';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import ResultGrid, { DEFAULT_PAGE_SIZE } from '../compontent/ResultGrid';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';

/**
 * ユーザー倉庫関係一覧（P604）
 *
 * ロケ番一覧と同じ配置で検索し、新規・修正は別画面へ遷移する。
 */

/** 関係タイプ1件（楽観ロック用） */
export interface RelationTypeRow {
    id: string;
    mappingType: string;
    version: number;
}

/** 一覧の1行（ユーザーと倉庫の組み合わせ） */
export interface RelationRow {
    id: string;
    userName: string;
    nickName: string;
    whCd: string;
    whNm: string;
    memo: string;
    relationTypes: string[];
    typeRows: RelationTypeRow[];
}

/** 検索条件 */
interface SearchForm {
    whCd: string;
    userName: string;
    relationTypes: string[];
}

/** コンボボックスの選択肢 */
interface OptionItem {
    key: string;
    value: string;
}

const EMPTY_SEARCH: SearchForm = { whCd: '', userName: '', relationTypes: [] };

/**
 * 選択値を文字列に正規化する
 * （選択コンポーネントは選択肢オブジェクトを返す場合があるため）
 */
const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

/** チェックボックスの選択値を文字列配列にする */
const toTypeList = (value: any): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeChoiceValue(item)).filter((item) => item !== '');
    }
    if (typeof value === 'string' && value.trim() !== '') {
        return value.split(',').map((item) => item.trim()).filter((item) => item !== '');
    }
    return [];
};

/** クリアボタン：白底・テーマ色の枠と文字（在庫一覧と同じ） */
const outlineButtonStyle: React.CSSProperties = {
    ...buttonSx.button,
    backgroundColor: '#ffffff',
    color: 'var(--mui-page-header-color)',
    border: '1px solid var(--mui-page-header-color)',
};

const P604: React.FC = () => {
    const navigate = useNavigate();
    const { request } = useApiRequest();
    const isNarrow = useMediaQuery('(max-width: 900px)');

    const [rows, setRows] = useState<RelationRow[]>([]);
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const [searchForm, setSearchForm] = useState<SearchForm>(EMPTY_SEARCH);
    const [formVersion, setFormVersion] = useState<number>(0);
    const [refreshKey, setRefreshKey] = useState<number>(0);
    const [warehouseChoices, setWarehouseChoices] = useState<OptionItem[]>([]);
    const [relationTypeOptions, setRelationTypeOptions] = useState<OptionItem[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<RelationRow | null>(null);

    /** 倉庫と関係タイプの選択肢を取得する */
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [relationTypes, warehouses] = await Promise.all([
                    request('post', 'api/common/options', { cmdOptionName: 'bss_user_relation_type' }, {}, false, false),
                    request('get', 'api/master/userRelation/warehouses', {}, {}, false, false),
                ]);
                setRelationTypeOptions(relationTypes?.data || []);
                setWarehouseChoices(warehouses?.data || []);
                setFormVersion((version) => version + 1);
            } catch (error) {
                setRelationTypeOptions([]);
                setWarehouseChoices([]);
            }
        };
        fetchOptions();
    }, []);

    /** ユーザー倉庫関係の一覧を取得する */
    useEffect(() => {
        const fetchList = async () => {
            try {
                const response = await request('get', 'api/master/userRelation/list', {
                    whCd: searchForm.whCd,
                    userName: searchForm.userName,
                    relationType: searchForm.relationTypes.join(','),
                });
                if (response?.code === 200) {
                    const list: RelationRow[] = (response.rows || []).map((item: any) => ({
                        id: String(item.id),
                        userName: item.userName || '',
                        nickName: item.nickName || item.userName || '',
                        whCd: item.whCd || '',
                        whNm: item.whNm || '',
                        memo: item.memo || '',
                        relationTypes: item.relationTypes || [],
                        typeRows: item.typeRows || [],
                    }));
                    setRows(list);
                }
            } catch (error) {
                setRows([]);
            }
        };
        fetchList();
    }, [searchForm, refreshKey]);

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        setSearchForm({
            whCd: normalizeChoiceValue(values?.whCd),
            userName: (values?.userName || '').trim(),
            relationTypes: toTypeList(values?.relationType),
        });
        setPageNum(1);
        setRefreshKey((key) => key + 1);
    };

    /** 検索条件をクリアする */
    const handleClear = () => {
        setSearchForm(EMPTY_SEARCH);
        setPageNum(1);
        setFormVersion((version) => version + 1);
        setRefreshKey((key) => key + 1);
    };

    /** 修正画面へ遷移する */
    const openEdit = (row: RelationRow) => {
        navigate('/P606', { state: { row } });
    };

    /** 削除を確定する */
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const response = await request('post', 'api/master/userRelation/delete', [{
                userName: deleteTarget.userName,
                whCd: deleteTarget.whCd,
                typeRows: deleteTarget.typeRows,
            }]);
            setDeleteTarget(null);
            if (response?.code >= 200 && response?.code < 300) {
                setRefreshKey((key) => key + 1);
            }
        } catch (error) {
            setDeleteTarget(null);
        }
    };

    const columnDefs: ColDef<RelationRow>[] = useMemo(() => [
        {
            headerName: 'ユーザー名',
            field: 'nickName',
            flex: 1,
            minWidth: 140,
            cellRenderer: (params: any) => (
                <span
                    style={tableSx.linkFontColumn as React.CSSProperties}
                    onClick={() => openEdit(params.data)}
                >
                    {params.value}
                </span>
            ),
        },
        { headerName: '倉庫名称', field: 'whNm', flex: 1, minWidth: 140 },
        {
            headerName: 'タイプ',
            field: 'relationTypes',
            flex: 2,
            minWidth: 280,
            sortable: false,
            cellRenderer: (params: any) => {
                const checked: string[] = params.data?.relationTypes || [];
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
                        {relationTypeOptions.map((option) => (
                            <label
                                key={option.key}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked.includes(option.key)}
                                    readOnly
                                    tabIndex={-1}
                                    onClick={(event) => event.preventDefault()}
                                    style={{ pointerEvents: 'none', accentColor: 'var(--mui-page-header-color)' }}
                                />
                                {option.value}
                            </label>
                        ))}
                    </div>
                );
            },
        },
        { headerName: '備考', field: 'memo', flex: 1.5, minWidth: 160 },
        {
            headerName: '操作',
            width: 150,
            cellStyle: { justifyContent: 'center' },
            cellRenderer: (params: any) => (
                <div style={{ display: 'flex', gap: '14px' }}>
                    <span
                        style={tableSx.linkFontColumn as React.CSSProperties}
                        onClick={() => openEdit(params.data)}
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
    ], [relationTypeOptions]);

    const choiceSx = {
        height: 'auto',
        input: {
            height: 'auto',
            '& .MuiFormGroup-root': {
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: '12px',
                height: 'auto',
            },
        },
    };

    return (
        <PageContainer title={'ユーザー倉庫関係一覧'} titleUnderline bottomSpace>
            <CustomCard
                plain
                sx={{ width: '100%' }}
                titleVariant={'body1'}
                title="検索条件"
                border={false}
                action={
                    <button
                        style={{ ...buttonSx.button, marginRight: '10px' }}
                        type="button"
                        onClick={() => navigate('/P605')}
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
                    defaultValues={{
                        whCd: searchForm.whCd,
                        userName: searchForm.userName,
                        relationType: searchForm.relationTypes,
                    }}
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
                            label="保管倉庫"
                            choices={warehouseChoices}
                            placeholder="選択してください"
                        />
                        <FormInput
                            type={'text'}
                            source="userName"
                            label="ユーザー名"
                            placeholder="入力してください"
                        />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormInput
                                type={'multiple-choice'}
                                source="relationType"
                                label="関係タイプ"
                                choices={relationTypeOptions}
                                sx={choiceSx}
                            />
                        </div>
                    </div>
                    <div
                        style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '1rem',
                            marginTop: '1rem',
                            marginBottom: '22px',
                        }}
                    >
                        <button style={outlineButtonStyle} type="button" onClick={handleClear}>
                            クリア
                        </button>
                        <button style={buttonSx.button} type="submit">
                            検索
                        </button>
                    </div>
                </SimpleForm>
            </CustomCard>

            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="検索結果一覧" border={false}>
                <ResultGrid<RelationRow>
                    columnDefs={columnDefs}
                    rowData={rows}
                    rowUniqueKey="id"
                    rowHeight={38}
                    showResultSummary
                    showPageSize
                    showBottomPagination
                    page={pageNum}
                    pageSize={pageSize}
                    onPageChange={setPageNum}
                    onPageSizeChange={(next) => {
                        setPageSize(next);
                        setPageNum(1);
                    }}
                    noRowsShow="該当するユーザー倉庫関係がありません。"
                />
            </CustomCard>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
                <button style={buttonSx.backButton} type="button" onClick={() => navigate(-1)}>
                    戻る
                </button>
            </div>

            <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>削除の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {`ユーザー「${deleteTarget?.nickName || ''}」と倉庫「${deleteTarget?.whNm || ''}」の関係を削除しますか？`}
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
        </PageContainer>
    );
};

export default P604;
