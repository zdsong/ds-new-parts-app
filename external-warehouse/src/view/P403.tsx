import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import useApiRequest from '../adapters/apiUtil';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import ResultGrid from '../compontent/ResultGrid';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';

/**
 * 移動依頼一覧画面（P403）
 *
 * 検索条件と一覧の並びは移動情報一覧の画面イメージに合わせる。
 * 移動状況の選択は「移動予定」「移動完了」の 2 つ。
 * 一覧は移動依頼の検索 API から取得する。
 */

/** 選択肢 */
interface OptionItem {
    key: string;
    value: string;
}

/** 明細の品目 */
interface MoveRequestItem {
    itemCode: string;
    itemName: string;
}

/** 移動依頼 1 件分（一覧の 1 行） */
interface MoveRequestRow {
    id: string;
    /** 移動依頼番号 */
    requestNo: string;
    /** 移動状況コード */
    status: string;
    /** 移動状況 */
    statusLabel: string;
    /** 移動元倉庫コード */
    sourceWhCd: string;
    /** 移動先倉庫コード */
    destWhCd: string;
    /** 移動先 */
    destWarehouse: string;
    /** 移動元 */
    sourceWarehouse: string;
    /** 移動希望日 */
    desiredDate: string;
    /** 移動依頼日 */
    requestDate: string;
    /** 移動登録日 */
    registeredDate: string;
    /** 移動完了日 */
    completedDate: string;
    /** 依頼者氏名 */
    requester: string;
    /** 移動登録者 */
    registrar: string;
    /** 移動完了者 */
    completer: string;
    /** 備考 */
    memo: string;
    /** 明細の品目。一覧には表示しない */
    items?: MoveRequestItem[];
}

/** 検索条件の型（③移動管理 3. の検索画面） */
interface SearchCondition {
    moveNo: string;
    itemCode: string;
    itemName: string;
    sourceWarehouse: string;
    destWarehouse: string;
    registeredDateStart: string;
    registeredDateEnd: string;
    completedDateStart: string;
    completedDateEnd: string;
    registrar: string;
    completer: string;
    statuses: string[];
}

// 詳細画面（P404／P405）はまだ 1・2・3 と倉庫 1・2 で表示している
const LEGACY_STATUS: Record<string, string> = {
    TF: '1',
    TF_P: '2',
    TF_F: '3',
};
const LEGACY_WAREHOUSE: Record<string, string> = {
    '10': '1',
    '20': '2',
};

/** 画面に出す移動状況（辞書 bss_transfer_status から取得する） */

// 表示件数の選択肢（設計書の「表示件数」に相当）
const PAGE_SIZE_CHOICES = [10, 20, 50];

/** 検索条件の初期値 */
const INITIAL_CONDITION: SearchCondition = {
    moveNo: '',
    itemCode: '',
    itemName: '',
    sourceWarehouse: '',
    destWarehouse: '',
    registeredDateStart: '',
    registeredDateEnd: '',
    completedDateStart: '',
    completedDateEnd: '',
    registrar: '',
    completer: '',
    statuses: [],
};

/** 選択値を取り出す（選択コンポーネントは選択肢オブジェクトを返すため key に正規化する） */
const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

/** 数字だけを取り出す（日付は「2026/10/01」と「2026-10-01」が混在するため比較用に使う） */
const digitsOnly = (value: string): string => (value || '').replace(/[^0-9]/g, '');

const P403: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    const { request } = useApiRequest();

    // 検索条件フォームの初期値（クリア時に書き戻す）
    const [formValues, setFormValues] = useState<SearchCondition>(INITIAL_CONDITION);
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 現在のページと 1 ページあたりの表示件数
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    // 日付範囲はフォーム値に載らないため個別に保持する
    const [registeredRange, setRegisteredRange] = useState<{ startDate: string; endDate: string }>({
        startDate: '',
        endDate: '',
    });
    const [completedRange, setCompletedRange] = useState<{ startDate: string; endDate: string }>({
        startDate: '',
        endDate: '',
    });
    const registeredDateRef = useRef<any>(null);
    const completedDateRef = useRef<any>(null);
    const [rows, setRows] = useState<MoveRequestRow[]>([]);
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [statusOptions, setStatusOptions] = useState<OptionItem[]>([]);

    const loadRows = useCallback(
        async (next: SearchCondition) => {
            const result = await request(
                'get',
                'api/transfer/list',
                {},
                {
                    moveNo: (next.moveNo || '').trim(),
                    sourceWhCd: next.sourceWarehouse,
                    destWhCd: next.destWarehouse,
                    itemCode: (next.itemCode || '').trim(),
                    itemName: (next.itemName || '').trim(),
                    registrar: (next.registrar || '').trim(),
                    completer: (next.completer || '').trim(),
                    registeredFrom: digitsOnly(next.registeredDateStart),
                    registeredTo: digitsOnly(next.registeredDateEnd),
                    completedFrom: digitsOnly(next.completedDateStart),
                    completedTo: digitsOnly(next.completedDateEnd),
                    statusCodes: (next.statuses || []).join(','),
                },
                true,
                false
            );
            setRows(Array.isArray(result?.data) ? result.data : []);
        },
        [request]
    );

    useEffect(() => {
        const loadOptions = async () => {
            const [warehouse, status] = await Promise.all([
                request('get', 'api/common/wh/options', {}, {}, false, false),
                request('post', 'api/common/options', { cmdOptionName: 'bss_transfer_status' }, {}, false, false),
            ]);
            setWarehouseOptions(Array.isArray(warehouse?.data) ? warehouse.data : []);
            const loaded = Array.isArray(status?.data) ? (status.data as OptionItem[]) : [];
            setStatusOptions(loaded);
        };
        loadOptions();
        loadRows(INITIAL_CONDITION);
    }, [loadRows, request]);

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        const statuses = Array.isArray(values?.statuses)
            ? values.statuses.map((value: any) => normalizeChoiceValue(value))
            : [];

        // 日付は開始・終了の前後関係をチェックする
        if (
            registeredRange.startDate &&
            registeredRange.endDate &&
            digitsOnly(registeredRange.startDate) > digitsOnly(registeredRange.endDate)
        ) {
            notify('移動登録日の範囲が正しくありません。開始日と終了日を確認してください。', {
                type: 'warning',
            });
            return;
        }
        if (
            completedRange.startDate &&
            completedRange.endDate &&
            digitsOnly(completedRange.startDate) > digitsOnly(completedRange.endDate)
        ) {
            notify('移動完了日の範囲が正しくありません。開始日と終了日を確認してください。', {
                type: 'warning',
            });
            return;
        }

        const next: SearchCondition = {
            moveNo: values?.moveNo || '',
            sourceWarehouse: normalizeChoiceValue(values?.sourceWarehouse),
            destWarehouse: normalizeChoiceValue(values?.destWarehouse),
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
            registrar: values?.registrar || '',
            completer: values?.completer || '',
            registeredDateStart: normalizeChoiceValue(registeredRange.startDate),
            registeredDateEnd: normalizeChoiceValue(registeredRange.endDate),
            completedDateStart: normalizeChoiceValue(completedRange.startDate),
            completedDateEnd: normalizeChoiceValue(completedRange.endDate),
            statuses,
        };
        // 検索時は 1 ページ目に戻す
        setPage(1);
        loadRows(next);
    };

    /** 検索条件をクリアする（一覧も全件に戻す） */
    const handleClear = () => {
        setFormValues(INITIAL_CONDITION);
        setFormVersion((version) => version + 1);
        setRegisteredRange({ startDate: '', endDate: '' });
        setCompletedRange({ startDate: '', endDate: '' });
        (registeredDateRef.current as any)?.clear?.();
        (completedDateRef.current as any)?.clear?.();
        setPage(1);
        loadRows(INITIAL_CONDITION);
    };

    /** 表示件数の変更（1 ページ目に戻す） */
    const handlePageSizeChange = (value: number) => {
        setPageSize(value);
        setPage(1);
    };

    /**
     * 移動依頼番号クリック時の処理
     * 移動先が行田工場なら入庫詳細、それ以外は出庫詳細へ遷移する。
     * 詳細画面はまだ旧コードで表示するため、渡す値だけ合わせる。
     */
    const handleOpenDetail = (row: MoveRequestRow) => {
        const detailPath = row.destWhCd === '10' ? '/P405' : '/P404';
        navigate(detailPath, {
            state: {
                requestNo: row.requestNo,
                status: LEGACY_STATUS[row.status] || row.status,
                destWarehouse: LEGACY_WAREHOUSE[row.destWhCd] || row.destWhCd,
                desiredDate: row.desiredDate,
                requester: row.requester,
                items: row.items || [],
            },
        });
    };

    const columnDefs = useMemo<ColDef<MoveRequestRow>[]>(
        () => [
            {
                headerName: '移動依頼番号',
                field: 'requestNo',
                width: 160,
                cellRenderer: (params: { data?: MoveRequestRow; value?: string }) => (
                    <span style={linkStyle} onClick={() => params.data && handleOpenDetail(params.data)}>
                        {params.value}
                    </span>
                ),
            },
            { headerName: '移動状況', field: 'statusLabel', width: 120 },
            { headerName: '移動元', field: 'sourceWarehouse', width: 140 },
            { headerName: '移動先', field: 'destWarehouse', width: 140 },
            { headerName: '移動依頼者', field: 'requester', width: 140 },
            { headerName: '移動依頼日', field: 'requestDate', width: 120 },
            { headerName: '移動登録者', field: 'registrar', width: 140 },
            { headerName: '移動登録日', field: 'registeredDate', width: 180 },
            { headerName: '移動完了者', field: 'completer', width: 140 },
            { headerName: '移動完了日', field: 'completedDate', width: 180 },
            { headerName: '備考', field: 'memo', flex: 1, minWidth: 160 },
        ],
        [navigate]
    );

    return (
        <PageContainer title={'移動依頼一覧'} titleUnderline bottomSpace>
            <div style={sectionTitleStyle}>検索条件</div>
            <SimpleForm
                key={formVersion}
                sx={formSx.formContainer}
                onSubmit={handleSearch}
                toolbar={false}
                defaultValues={formValues}
            >
                <div style={formSx.form2}>
                    <FormInput type={'text'} source="moveNo" label="移動依頼番号" />
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '150px minmax(0, 1fr) minmax(0, 1fr)',
                            columnGap: '0.75rem',
                            alignItems: 'center',
                            width: '100%',
                            minWidth: 0,
                        }}
                    >
                        <FormInput
                            type={'filter-select'}
                            source="sourceWarehouse"
                            label="移動先"
                            choices={warehouseOptions}
                            sx={{
                                display: 'contents',
                                label: { width: '150px', flexShrink: 0 },
                                input: { width: '100%', minWidth: 0 },
                            }}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="destWarehouse"
                            label={false}
                            choices={warehouseOptions}
                            sx={{
                                width: '100%',
                                minWidth: 0,
                                flex: 'none',
                                marginTop: 0,
                                input: { width: '100%', minWidth: 0 },
                            }}
                        />
                    </div>
                    <FormInput type={'text'} source="itemCode" label="品目コード" />
                    <FormInput type={'text'} source="itemName" label="品目名" />
                    <FormInput type={'text'} source="registrar" label="移動登録者" />
                    <FormInput
                        ref={registeredDateRef}
                        type={'input-daterange'}
                        source="registeredDate"
                        label="移動登録日"
                        onChange={(value: any) =>
                            setRegisteredRange({
                                startDate: value?.startDate || '',
                                endDate: value?.endDate || '',
                            })
                        }
                    />
                    <FormInput type={'text'} source="completer" label="移動完了者" />
                    <FormInput
                        ref={completedDateRef}
                        type={'input-daterange'}
                        source="completedDate"
                        label="移動完了日"
                        onChange={(value: any) =>
                            setCompletedRange({
                                startDate: value?.startDate || '',
                                endDate: value?.endDate || '',
                            })
                        }
                    />
                    <FormInput
                        type={'multiple-choice'}
                        source="statuses"
                        label="移動状況"
                        choices={statusOptions}
                        sx={{ input: { '& .MuiFormGroup-root': { flexDirection: 'row', flexWrap: 'nowrap' } } }}
                    />
                </div>

                <div style={searchButtonBarStyle}>
                    <button style={outlineButtonStyle} type="button" onClick={handleClear}>
                        クリア
                    </button>
                    <button style={buttonSx.button} type="submit">
                        検索
                    </button>
                </div>
            </SimpleForm>

            <div style={{ ...sectionTitleStyle, marginTop: '22px' }}>検索結果一覧</div>
            <ResultGrid<MoveRequestRow>
                columnDefs={columnDefs}
                rowData={rows}
                showResultSummary
                showPageSize
                showTopPagination
                showBottomPagination
                pageSizeChoices={PAGE_SIZE_CHOICES}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
                noRowsShow="該当する移動依頼がありません。"
                bottomLeft={
                    <button type="button" style={backButtonStyle} onClick={() => navigate(-1)}>
                        戻る
                    </button>
                }
            />
        </PageContainer>
    );
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 700,
    margin: '8px 0 10px',
};

const searchButtonBarStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1rem',
};

const outlineButtonStyle: React.CSSProperties = {
    ...buttonSx.button,
    backgroundColor: '#ffffff',
    color: '#1a73c7',
    border: '1px solid #1a73c7',
};

const backButtonStyle: React.CSSProperties = {
    ...buttonSx.button,
    backgroundColor: '#5b9bd5',
};

const linkStyle: React.CSSProperties = {
    ...(tableSx.linkFontColumn as React.CSSProperties),
    color: '#1a73c7',
};

export default P403;
