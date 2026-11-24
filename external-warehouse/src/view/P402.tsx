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
 * 移動一覧画面（P402）
 *
 * 設計書：③移動管理
 *   移動管理（bss_transfer）に登録された移動番号を一覧で確認する。
 *   移動番号を選ぶと移動情報詳細（P407）を開く。
 *   画面レイアウトは移動一覧の画面イメージに合わせる。
 */

/** 選択肢 */
interface OptionItem {
    key: string;
    value: string;
}

/** 移動一覧 1 件分（一覧の 1 行） */
interface MoveRow {
    id: string;
    /** 移動番号 */
    transferNo: string;
    /** 移動状況コード */
    status: string;
    /** 移動状況 */
    statusLabel: string;
    /** 移動元倉庫コード */
    sourceWhCd: string;
    /** 移動元 */
    sourceWarehouse: string;
    /** 移動先倉庫コード */
    destWhCd: string;
    /** 移動先 */
    destWarehouse: string;
    /** 移動先ロケコード */
    destLocCd: string;
    /** 移動登録者 */
    registrar: string;
    /** 移動登録日 */
    registeredDate: string;
    /** 移動完了者 */
    completer: string;
    /** 移動完了日 */
    completedDate: string;
    /** 備考 */
    memo: string;
}

/** 検索条件 */
interface SearchCondition {
    moveNo: string;
    sourceWarehouse: string;
    destWarehouse: string;
    destLocation: string;
    itemCode: string;
    itemName: string;
    registrar: string;
    completer: string;
    registeredDateStart: string;
    registeredDateEnd: string;
    completedDateStart: string;
    completedDateEnd: string;
    statuses: string[];
}

/** 移動依頼状態（この画面では移動依頼を表示しない） */
const TRANSFER_REQUEST_STATUS = 'TF';

/** 表示件数の選択肢 */
const PAGE_SIZE_CHOICES = [10, 20, 50];

/** 検索条件の初期値 */
const INITIAL_CONDITION: SearchCondition = {
    moveNo: '',
    sourceWarehouse: '',
    destWarehouse: '',
    destLocation: '',
    itemCode: '',
    itemName: '',
    registrar: '',
    completer: '',
    registeredDateStart: '',
    registeredDateEnd: '',
    completedDateStart: '',
    completedDateEnd: '',
    statuses: [],
};

/** 選択値を取り出す（選択コンポーネントは選択肢オブジェクトを返すため key に正規化する） */
const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

/** 数字だけを取り出す（日付は「2026/10/01」と「2026-10-01」が混在するため比較用に使う） */
const digitsOnly = (value: string): string => (value || '').replace(/[^0-9]/g, '');

const P402: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    const { request } = useApiRequest();

    const [formValues, setFormValues] = useState<SearchCondition>(INITIAL_CONDITION);
    const [formVersion, setFormVersion] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
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
    const [rows, setRows] = useState<MoveRow[]>([]);
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [locationOptions, setLocationOptions] = useState<OptionItem[]>([]);
    const [statusOptions, setStatusOptions] = useState<OptionItem[]>([]);

    const loadRows = useCallback(
        async (next: SearchCondition) => {
            const result = await request(
                'get',
                'api/transfer/moves',
                {},
                {
                    moveNo: (next.moveNo || '').trim(),
                    sourceWhCd: next.sourceWarehouse,
                    destWhCd: next.destWarehouse,
                    destLocCd: next.destLocation,
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
            // 移動依頼（移動依赖）はこの画面の対象外のため除外する
            setStatusOptions(loaded.filter((option) => option.key !== TRANSFER_REQUEST_STATUS));
        };
        loadOptions();
        loadRows(INITIAL_CONDITION);
    }, [loadRows, request]);

    /** 移動先倉庫が変わったらロケ番の選択肢を読み直す */
    const handleDestWarehouseChange = async (value: any) => {
        const whCd = normalizeChoiceValue(value);
        setFormValues((prev) => ({ ...prev, destWarehouse: whCd, destLocation: '' }));
        if (!whCd) {
            setLocationOptions([]);
            return;
        }
        try {
            const result = await request(
                'get',
                `api/common/${whCd}/location/options`,
                {},
                {},
                false,
                false
            );
            setLocationOptions(Array.isArray(result?.data) ? result.data : []);
        } catch (error) {
            console.error(error);
            setLocationOptions([]);
        }
    };

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        const statuses = Array.isArray(values?.statuses)
            ? values.statuses.map((value: any) => normalizeChoiceValue(value))
            : [];

        if (
            registeredRange.startDate &&
            registeredRange.endDate &&
            digitsOnly(registeredRange.startDate) > digitsOnly(registeredRange.endDate)
        ) {
            notify('notify.transfer.register_date_range', {
                type: 'warning',
            });
            return;
        }
        if (
            completedRange.startDate &&
            completedRange.endDate &&
            digitsOnly(completedRange.startDate) > digitsOnly(completedRange.endDate)
        ) {
            notify('notify.transfer.complete_date_range', {
                type: 'warning',
            });
            return;
        }

        const next: SearchCondition = {
            moveNo: values?.moveNo || '',
            sourceWarehouse: normalizeChoiceValue(values?.sourceWarehouse),
            destWarehouse: normalizeChoiceValue(values?.destWarehouse),
            destLocation: normalizeChoiceValue(values?.destLocation),
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
        setFormValues(next);
        setPage(1);
        loadRows(next);
    };

    /** 検索条件をクリアする */
    const handleClear = () => {
        setFormValues(INITIAL_CONDITION);
        setFormVersion((version) => version + 1);
        setRegisteredRange({ startDate: '', endDate: '' });
        setCompletedRange({ startDate: '', endDate: '' });
        setLocationOptions([]);
        (registeredDateRef.current as any)?.clear?.();
        (completedDateRef.current as any)?.clear?.();
        setPage(1);
        loadRows(INITIAL_CONDITION);
    };

    /** 表示件数の変更 */
    const handlePageSizeChange = (value: number) => {
        setPageSize(value);
        setPage(1);
    };

    /** 移動番号クリック時の処理（移動情報詳細へ） */
    const handleOpenDetail = (row: MoveRow) => {
        navigate(`/P407?moveNo=${encodeURIComponent(row.transferNo)}`);
    };

    const columnDefs = useMemo<ColDef<MoveRow>[]>(
        () => [
            {
                headerName: '移動番号',
                field: 'transferNo',
                width: 170,
                cellRenderer: (params: { data?: MoveRow; value?: string }) => (
                    <span style={linkStyle} onClick={() => params.data && handleOpenDetail(params.data)}>
                        {params.value}
                    </span>
                ),
            },
            { headerName: '移動状況', field: 'statusLabel', width: 120 },
            { headerName: '移動元', field: 'sourceWarehouse', width: 140 },
            { headerName: '移動先', field: 'destWarehouse', width: 140 },
            { headerName: '移動登録日', field: 'registeredDate', width: 180 },
            { headerName: '移動完了日', field: 'completedDate', width: 180 },
        ],
        []
    );

    return (
        <PageContainer title={'移動一覧'} titleUnderline bottomSpace>
            <div style={sectionTitleStyle}>検索条件</div>
            <SimpleForm
                key={formVersion}
                sx={formSx.formContainer}
                onSubmit={handleSearch}
                toolbar={false}
                defaultValues={formValues}
            >
                <div style={formSx.form2}>
                    <FormInput type={'text'} source="moveNo" label="移動番号" />
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
                            source="destWarehouse"
                            label="移動先"
                            choices={warehouseOptions}
                            onChange={handleDestWarehouseChange}
                            sx={{
                                display: 'contents',
                                label: { width: '150px', flexShrink: 0 },
                                input: { width: '100%', minWidth: 0 },
                            }}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="destLocation"
                            label={false}
                            choices={locationOptions}
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
            <ResultGrid<MoveRow>
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
                noRowsShow="該当する移動情報がありません。"
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

export default P402;
