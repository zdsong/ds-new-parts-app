import React, { useMemo, useRef, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { Box, MenuItem, Select, Typography } from '@mui/material';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import DataGrid from '../compontent/DataGrid';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';

/**
 * 移動依頼一覧画面（P403）
 *
 * 画面イメージ：②移動依頼管理 2. 移動依頼を確認する（生産管理）
 *
 * 生産管理の担当者が、登録済みの移動依頼（出庫・入庫）を検索して内容を確認する画面。
 * 上半分が検索条件、下半分が検索結果の一覧表。
 * 一覧の移動依頼番号をクリックすると、移動依頼の詳細画面へ遷移する（詳細画面は別画面）。
 *
 * 補足：バックエンドに移動依頼系の API が無いため、一覧データはフロント側の仮実装。
 *       API 連携時は下部の MOVE_REQUESTS を API 応答に置き換える。
 */

/** 移動依頼 1 件分（一覧の 1 行） */
interface MoveRequestRow {
    id: string;
    /** 移動依頼番号（出庫：O-／入庫：I-） */
    requestNo: string;
    /** 移動状況（1:移動依頼 / 2:移動予定 / 3:移動完了） */
    status: string;
    /** 移動先（1:行田工場 / 2:外部倉庫） */
    destWarehouse: string;
    /** 移動希望日（yyyy/mm/dd） */
    desiredDate: string;
    /** 移動依頼日（yyyy/mm/dd hh:mm） */
    requestDate: string;
    /** 依頼者氏名 */
    requester: string;
    /** 明細の品目（品目コード・品目名の検索用。一覧には表示しない） */
    items: { itemCode: string; itemName: string }[];
}

/** 検索条件の型 */
interface SearchCondition {
    requestNo: string;
    destWarehouse: string;
    itemCode: string;
    itemName: string;
    requester: string;
    requestDateStart: string;
    requestDateEnd: string;
    statuses: string[];
}

// 移動状況の選択肢
const STATUS_CHOICES = [
    { key: '1', value: '移動依頼' },
    { key: '2', value: '移動予定' },
    { key: '3', value: '移動完了' },
];

// 移動先の選択肢
const DEST_CHOICES = [
    { key: '1', value: '行田工場' },
    { key: '2', value: '外部倉庫' },
];

// コード→表示名の変換表
const STATUS_LABELS: Record<string, string> = Object.fromEntries(
    STATUS_CHOICES.map((choice) => [choice.key, choice.value])
);
const DEST_LABELS: Record<string, string> = Object.fromEntries(
    DEST_CHOICES.map((choice) => [choice.key, choice.value])
);

// 表示件数の選択肢（設計書の「表示件数」に相当）
const PAGE_SIZE_CHOICES = [10, 20, 50];

/** 検索条件の初期値 */
const INITIAL_CONDITION: SearchCondition = {
    requestNo: '',
    destWarehouse: '',
    itemCode: '',
    itemName: '',
    requester: '',
    requestDateStart: '',
    requestDateEnd: '',
    statuses: [],
};

/**
 * 一覧の仮データ（設計書の画面イメージに合わせた内容＋ページング確認用の行）
 * 出庫（O-）は移動先が外部倉庫、入庫（I-）は移動先が行田工場になる。
 */
const MOVE_REQUESTS: MoveRequestRow[] = [
    {
        id: '1',
        requestNo: 'I-260805-002',
        status: '2',
        destWarehouse: '1',
        desiredDate: '2026/10/10',
        requestDate: '2026/10/01 10:00',
        requester: '山田 太郎（生産管理）',
        items: [
            { itemCode: 'GP20A-101-RN-NAV3-00', itemName: 'アルミ支柱 A' },
            { itemCode: 'TLR560LB-S400-200-00', itemName: '本体ASSY H400' },
        ],
    },
    {
        id: '2',
        requestNo: 'O-260805-001',
        status: '3',
        destWarehouse: '2',
        desiredDate: '2026/10/10',
        requestDate: '2026/10/01 10:00',
        requester: '山田 太郎（生産管理）',
        items: [{ itemCode: 'GP20A-102-RN-NAV3-00', itemName: 'アルミ支柱 B' }],
    },
    {
        id: '3',
        requestNo: 'I-260804-004',
        status: '1',
        destWarehouse: '1',
        desiredDate: '2026/10/08',
        requestDate: '2026/10/02 09:20',
        requester: '佐藤 花子（生産管理）',
        items: [{ itemCode: 'HP30C-310-RN-NBV2-01', itemName: '化粧キャップ C' }],
    },
    {
        id: '4',
        requestNo: 'O-260804-003',
        status: '2',
        destWarehouse: '2',
        desiredDate: '2026/10/08',
        requestDate: '2026/10/02 09:05',
        requester: '佐藤 花子（生産管理）',
        items: [{ itemCode: 'V15FSM-100-00', itemName: '本体ASSY' }],
    },
    {
        id: '5',
        requestNo: 'I-260803-006',
        status: '3',
        destWarehouse: '1',
        desiredDate: '2026/10/05',
        requestDate: '2026/10/03 14:40',
        requester: '鈴木 一郎（生産管理）',
        items: [{ itemCode: 'TLR280LB-S400-401-BK-00', itemName: 'H400 背面化粧扉（ブラック）' }],
    },
    {
        id: '6',
        requestNo: 'O-260803-005',
        status: '3',
        destWarehouse: '2',
        desiredDate: '2026/10/05',
        requestDate: '2026/10/03 14:20',
        requester: '鈴木 一郎（生産管理）',
        items: [{ itemCode: 'TLP280LB-S400N-301-BK-01', itemName: 'H400 捺印扉（ブラック）' }],
    },
    {
        id: '7',
        requestNo: 'I-260802-008',
        status: '1',
        destWarehouse: '1',
        desiredDate: '2026/10/03',
        requestDate: '2026/10/04 08:30',
        requester: '高橋 美咲（生産管理）',
        items: [{ itemCode: 'GP20A-101-RN-NAV3-00', itemName: 'アルミ支柱 A' }],
    },
    {
        id: '8',
        requestNo: 'O-260802-007',
        status: '2',
        destWarehouse: '2',
        desiredDate: '2026/10/03',
        requestDate: '2026/10/04 08:10',
        requester: '高橋 美咲（生産管理）',
        items: [{ itemCode: 'V15FSM-200-00', itemName: '本体ASSY B' }],
    },
    {
        id: '9',
        requestNo: 'I-260801-010',
        status: '3',
        destWarehouse: '1',
        desiredDate: '2026/10/01',
        requestDate: '2026/10/05 16:00',
        requester: '伊藤 健（生産管理）',
        items: [{ itemCode: 'HP30C-310-RN-NBV2-01', itemName: '化粧キャップ C' }],
    },
    {
        id: '10',
        requestNo: 'O-260801-009',
        status: '3',
        destWarehouse: '2',
        desiredDate: '2026/10/01',
        requestDate: '2026/10/05 15:45',
        requester: '伊藤 健（生産管理）',
        items: [{ itemCode: 'TLR560LB-S400-200-00', itemName: '本体ASSY H400' }],
    },
    {
        id: '11',
        requestNo: 'I-260731-012',
        status: '1',
        destWarehouse: '1',
        desiredDate: '2026/09/30',
        requestDate: '2026/10/06 10:15',
        requester: '渡辺 由紀（生産管理）',
        items: [{ itemCode: 'GP20A-102-RN-NAV3-00', itemName: 'アルミ支柱 B' }],
    },
    {
        id: '12',
        requestNo: 'O-260731-011',
        status: '2',
        destWarehouse: '2',
        desiredDate: '2026/09/30',
        requestDate: '2026/10/06 10:00',
        requester: '渡辺 由紀（生産管理）',
        items: [{ itemCode: 'V15FSM-110-00', itemName: '本体ASSY A' }],
    },
];

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

    // 検索条件（確定値）
    const [condition, setCondition] = useState<SearchCondition>(INITIAL_CONDITION);
    // 検索条件フォームの初期値（クリア時に書き戻す）
    const [formValues, setFormValues] = useState<SearchCondition>(INITIAL_CONDITION);
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 現在のページと 1 ページあたりの表示件数
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    // 移動依頼日（範囲）。日付範囲コンポーネントはフォーム値に載らないため個別に保持する。
    const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
        startDate: '',
        endDate: '',
    });
    const dateRangeRef = useRef<any>(null);

    /** 検索条件で絞り込んだ一覧 */
    const filteredRequests = useMemo(() => {
        const requestNo = (condition.requestNo || '').trim();
        const itemCode = (condition.itemCode || '').trim();
        const itemName = (condition.itemName || '').trim();
        const requester = (condition.requester || '').trim();
        const startDate = digitsOnly(condition.requestDateStart);
        const endDate = digitsOnly(condition.requestDateEnd);

        return MOVE_REQUESTS.filter((request) => {
            if (requestNo && !request.requestNo.includes(requestNo)) {
                return false;
            }
            if (
                condition.statuses.length > 0 &&
                !condition.statuses.includes(request.status)
            ) {
                return false;
            }
            if (condition.destWarehouse && request.destWarehouse !== condition.destWarehouse) {
                return false;
            }
            if (
                itemCode &&
                !request.items.some((item) => item.itemCode.includes(itemCode))
            ) {
                return false;
            }
            if (
                itemName &&
                !request.items.some((item) => item.itemName.includes(itemName))
            ) {
                return false;
            }
            if (requester && !request.requester.includes(requester)) {
                return false;
            }

            // 移動依頼日は日付部分だけで範囲比較する
            const requestDate = digitsOnly(request.requestDate.slice(0, 10));
            if (startDate && requestDate < startDate) {
                return false;
            }
            if (endDate && requestDate > endDate) {
                return false;
            }
            return true;
        });
    }, [condition]);

    /** 現在ページの表示行 */
    const pageRows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredRequests.slice(start, start + pageSize);
    }, [filteredRequests, page, pageSize]);

    /** 「1 - 10 件を表示」の表示範囲 */
    const visibleRange = useMemo(() => {
        if (filteredRequests.length === 0) {
            return { start: 0, end: 0 };
        }
        const start = (page - 1) * pageSize + 1;
        const end = Math.min(page * pageSize, filteredRequests.length);
        return { start, end };
    }, [filteredRequests.length, page, pageSize]);

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        const statuses = Array.isArray(values?.statuses)
            ? values.statuses.map((value: any) => normalizeChoiceValue(value))
            : [];

        // 移動依頼日は開始・終了の前後関係をチェックする
        if (dateRange.startDate && dateRange.endDate) {
            if (digitsOnly(dateRange.startDate) > digitsOnly(dateRange.endDate)) {
                notify('移動依頼日の範囲が正しくありません。開始日と終了日を確認してください。', {
                    type: 'warning',
                });
                return;
            }
        }

        setCondition({
            requestNo: values?.requestNo || '',
            destWarehouse: normalizeChoiceValue(values?.destWarehouse),
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
            requester: values?.requester || '',
            requestDateStart: normalizeChoiceValue(dateRange.startDate),
            requestDateEnd: normalizeChoiceValue(dateRange.endDate),
            statuses,
        });
        // 検索時は 1 ページ目に戻す
        setPage(1);
    };

    /** 検索条件をクリアする（一覧も全件に戻す） */
    const handleClear = () => {
        setCondition(INITIAL_CONDITION);
        setFormValues(INITIAL_CONDITION);
        setFormVersion((version) => version + 1);
        setDateRange({ startDate: '', endDate: '' });
        (dateRangeRef.current as any)?.clear?.();
        setPage(1);
    };

    /** 表示件数の変更（1 ページ目に戻す） */
    const handlePageSizeChange = (value: number) => {
        setPageSize(value);
        setPage(1);
    };

    /**
     * 移動依頼番号クリック時の処理
     * 番号の枝番で出庫（O-）と入庫（I-）を見分け、それぞれの詳細画面へ遷移する。
     * 詳細画面は一覧の行内容をそのまま受け取る（API 連携時は番号だけ渡して再取得する形に変える）。
     */
    const handleOpenDetail = (request: MoveRequestRow) => {
        const detailPath = request.requestNo.startsWith('I-') ? '/P405' : '/P404';
        navigate(detailPath, { state: request });
    };

    // 一覧の列定義（設計書の 6 項目）
    const columnDefs: ColDef<MoveRequestRow>[] = [
        {
            headerName: '移動依頼番号',
            field: 'requestNo',
            width: 170,
            cellRenderer: (params: any) => (
                <span
                    style={tableSx.linkFontColumn as React.CSSProperties}
                    onClick={() => handleOpenDetail(params.data as MoveRequestRow)}
                >
                    {params.data.requestNo}
                </span>
            ),
        },
        {
            headerName: '移動状況',
            width: 120,
            valueGetter: (params) => STATUS_LABELS[params.data?.status ?? ''] ?? '',
        },
        {
            headerName: '移動先',
            width: 120,
            valueGetter: (params) => DEST_LABELS[params.data?.destWarehouse ?? ''] ?? '',
        },
        { headerName: '移動希望日', field: 'desiredDate', width: 130 },
        { headerName: '移動依頼日', field: 'requestDate', width: 170 },
        { headerName: '依頼者氏名', field: 'requester', flex: 1, minWidth: 200 },
    ];

    return (
        <PageContainer title={'移動依頼一覧'}>
            {/* 検索条件 */}
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="検索条件" border={false}>
                <SimpleForm
                    key={formVersion}
                    sx={formSx.formContainer}
                    onSubmit={handleSearch}
                    toolbar={false}
                    defaultValues={formValues}
                >
                    <div style={formSx.form2}>
                        <FormInput
                            type={'text'}
                            source="requestNo"
                            label="移動依頼番号"
                            placeholder="入力してください"
                        />
                        <FormInput
                            type={'filter-select'}
                            source="destWarehouse"
                            label="移動先"
                            choices={DEST_CHOICES}
                        />
                        <FormInput
                            type={'text'}
                            source="itemCode"
                            label="品目コード"
                            placeholder="入力してください"
                        />
                        <FormInput
                            type={'text'}
                            source="itemName"
                            label="品目名"
                            placeholder="入力してください"
                        />
                        <FormInput
                            type={'text'}
                            source="requester"
                            label="依頼者"
                            placeholder="入力してください"
                        />
                        <FormInput
                            ref={dateRangeRef}
                            type={'input-daterange'}
                            source="requestDate"
                            label="移動依頼日"
                            onChange={(value: any) =>
                                setDateRange({
                                    startDate: value?.startDate || '',
                                    endDate: value?.endDate || '',
                                })
                            }
                        />
                        <FormInput
                            type={'multiple-choice'}
                            source="statuses"
                            label="移動状況"
                            choices={STATUS_CHOICES}
                        />
                    </div>

                    <div style={searchButtonBarStyle}>
                        <button style={buttonSx.button} type="button" onClick={handleClear}>
                            クリア
                        </button>
                        <button style={buttonSx.button} type="submit">
                            検索
                        </button>
                    </div>
                </SimpleForm>
            </CustomCard>

            {/* 検索結果 */}
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="検索結果一覧" border={false}>
                <div style={resultHeaderStyle}>
                    <div style={resultSummaryStyle}>
                        <Typography variant={'body2'} sx={{ fontSize: 13 }}>
                            検索結果：{filteredRequests.length} 件
                        </Typography>
                        <Typography variant={'body2'} sx={{ fontSize: 13, color: '#666666' }}>
                            {visibleRange.start} - {visibleRange.end} 件を表示
                        </Typography>
                    </div>
                    <div style={pageSizeStyle}>
                        <Typography variant={'body2'} sx={{ fontSize: 13 }}>
                            表示件数
                        </Typography>
                        <Select
                            size="small"
                            value={pageSize}
                            onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                            sx={{ height: 28, fontSize: 13, backgroundColor: '#ffffff' }}
                        >
                            {PAGE_SIZE_CHOICES.map((size) => (
                                <MenuItem key={size} value={size} sx={{ fontSize: 13 }}>
                                    {size}
                                </MenuItem>
                            ))}
                        </Select>
                        <Typography variant={'body2'} sx={{ fontSize: 13 }}>
                            件
                        </Typography>
                    </div>
                </div>

                <div className="ag-theme-alpine p403-grid" style={tableSx.tableContainer}>
                    <DataGrid<MoveRequestRow>
                        columnDefs={columnDefs}
                        rowData={pageRows}
                        page={page}
                        pageSize={pageSize}
                        rowTotal={filteredRequests.length}
                        onPageChange={(current) => setPage(current)}
                        rowUniqueKey="id"
                        selectionMode="none"
                        pagination
                        rowHeight={38}
                        noRowsShow="該当する移動依頼がありません。"
                    />
                </div>

                {/* 一覧の min-height（350px）を解除し、行数に合わせて高さを詰める */}
                <style>{`
                    .p403-grid .ag-center-cols-viewport,
                    .p403-grid .ag-center-cols-clipper {
                        min-height: 0 !important;
                    }
                `}</style>
            </CustomCard>

            {/* 操作ボタン（設計書どおり画面左下に戻るを配置する） */}
            <div style={footerStyle}>
                <button style={buttonSx.button} type="button" onClick={() => navigate(-1)}>
                    戻る
                </button>
            </div>
        </PageContainer>
    );
};

// 検索ボタン領域（フォームの下に右寄せで配置する）
const searchButtonBarStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1rem',
};

// 検索結果ヘッダー（件数表示と表示件数を左右に配置する）
const resultHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '0 0 8px 0',
};

// 検索結果ヘッダーの左側（検索結果件数と表示範囲）
const resultSummaryStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
};

// 表示件数の選択領域
const pageSizeStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
};

// 画面下部のボタン領域（戻るは左寄せ）
const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-start',
    margin: '5px 0',
};

export default P403;
