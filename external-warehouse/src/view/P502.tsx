import React, { useEffect, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { MenuItem, Select } from '@mui/material';
import { ColDef } from 'ag-grid-community';
import { useNavigate, useSearchParams } from 'react-router-dom';

import useApiRequest from '../adapters/apiUtil';
import PageContainer from '../compontent/PageContainer';
import ResultGrid from '../compontent/ResultGrid';
import { buttonSx, tableSx } from '../styles/commonSX';

/**
 * 在庫詳細（品目）画面（P502）
 *
 * 画面イメージ：④在庫管理 在庫詳細（品目）
 * 在庫一覧（P501）の品目コードから開く。
 */

/** パレット番号一覧の 1 行 */
interface PalletRow {
    id: string;
    palletNo: string;
    warehouse: string;
    storageType: string;
    quantity: number | string;
    usable: string;
    remark: string;
}

/** 移動履歴の 1 行 */
interface HistoryRow {
    id: string;
    status: string;
    warehouse: string;
    quantity: number | string | null;
    usedQty: number | string | null;
    lostQty: number | string | null;
    moveAt: string;
    requestNo: string;
    requestAt: string;
    requester: string;
    updatedAt: string;
    updater: string;
    /** 履歴表に破棄数の列は無い。画面列だけ残す */
    discardQty?: string;
}

/** パレット単位の移動履歴 */
interface HistoryGroup {
    palletNo: string;
    storagePeriod: string;
    place: string;
    rows: HistoryRow[];
}

/** 品目の在庫詳細 */
interface ItemDetail {
    itemCode: string;
    itemName: string;
    classification: string;
    quantity: number | string;
    updatedAt: string;
    updater: string;
    pallets: PalletRow[];
    histories: HistoryGroup[];
}

const EMPTY_DETAIL: ItemDetail = {
    itemCode: '',
    itemName: '',
    classification: '',
    quantity: '',
    updatedAt: '',
    updater: '',
    pallets: [],
    histories: [],
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 700,
    margin: '18px 0 10px',
};

const infoGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    columnGap: '4rem',
    rowGap: '10px',
    maxWidth: '920px',
};

const infoItemStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '7.5rem minmax(0, 1fr)',
    columnGap: '1rem',
    alignItems: 'center',
    fontSize: '14px',
};

const linkStyle: React.CSSProperties = {
    ...(tableSx.linkFontColumn as React.CSSProperties),
    color: '#1a73c7',
};

const backButtonStyle: React.CSSProperties = {
    ...buttonSx.button,
    backgroundColor: '#5b9bd5',
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={infoItemStyle}>
        <span>{label}</span>
        <span>{value}</span>
    </div>
);

/** 末尾の 0 を除いた数量。空は空のまま */
const formatQuantity = (value: unknown) => {
    if (value == null || value === '') {
        return '';
    }
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : String(value);
};

const P502: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const itemCode = searchParams.get('itemCode') || '';
    const { request } = useApiRequest();
    const [detail, setDetail] = useState<ItemDetail>(EMPTY_DETAIL);
    const [palletFilter, setPalletFilter] = useState('');

    useEffect(() => {
        const load = async () => {
            if (!itemCode) {
                setDetail(EMPTY_DETAIL);
                return;
            }
            const result = await request('get', `api/inventory/item/${encodeURIComponent(itemCode)}`, {}, {}, true, false);
            const data = result?.data;
            setDetail(data && typeof data === 'object' ? data : EMPTY_DETAIL);
            setPalletFilter('');
        };
        load();
    }, [itemCode, request]);

    const histories = detail.histories || [];
    const pallets = detail.pallets || [];
    const visibleGroups = palletFilter ? histories.filter((group) => group.palletNo === palletFilter) : histories;

    const palletColumnDefs = useMemo<ColDef<PalletRow>[]>(
        () => [
            {
                headerName: 'パレット番号',
                field: 'palletNo',
                width: 160,
                cellRenderer: (params: { value?: string }) => (
                    <span style={linkStyle} onClick={() => params.value && setPalletFilter(params.value)}>
                        {params.value}
                    </span>
                ),
            },
            { headerName: '保管場所', field: 'warehouse', width: 140 },
            { headerName: '保管区分', field: 'storageType', width: 120 },
            {
                headerName: '保管数',
                field: 'quantity',
                width: 110,
                valueFormatter: (params) => formatQuantity(params.value),
                cellStyle: { justifyContent: 'flex-end' },
            },
            { headerName: '使用可否', field: 'usable', width: 120 },
            { headerName: '備考', field: 'remark', flex: 1, minWidth: 160 },
        ],
        []
    );

    const historyColumnDefs = useMemo<ColDef<HistoryRow>[]>(
        () => [
            { headerName: 'ステータス', field: 'status', width: 120 },
            { headerName: '保管場所', field: 'warehouse', width: 120 },
            {
                headerName: '数量',
                field: 'quantity',
                width: 90,
                valueFormatter: (params) => formatQuantity(params.value),
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '利用数',
                field: 'usedQty',
                width: 90,
                valueFormatter: (params) => formatQuantity(params.value),
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '紛失/破損数',
                field: 'lostQty',
                width: 120,
                valueFormatter: (params) => formatQuantity(params.value),
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '破棄数',
                field: 'discardQty',
                width: 90,
                cellStyle: { justifyContent: 'flex-end' },
            },
            { headerName: '移動日時', field: 'moveAt', width: 160 },
            {
                headerName: '移動依頼番号',
                field: 'requestNo',
                width: 140,
                cellRenderer: (params: { value?: string }) =>
                    params.value ? <span style={linkStyle}>{params.value}</span> : '',
            },
            { headerName: '移動依頼日時', field: 'requestAt', width: 160 },
            { headerName: '移動依頼者', field: 'requester', width: 180 },
            { headerName: '更新日時', field: 'updatedAt', width: 160 },
            { headerName: '更新者', field: 'updater', width: 180 },
        ],
        []
    );

    return (
        <PageContainer title="在庫詳細（品目）">
            <div style={sectionTitleStyle}>■基本情報</div>
            <div style={infoGridStyle}>
                <InfoItem label="品目コード" value={detail.itemCode || itemCode} />
                <InfoItem label="品目名" value={detail.itemName || ''} />
                <InfoItem label="在庫数" value={formatQuantity(detail.quantity)} />
                <InfoItem label="最終更新日時" value={detail.updatedAt || ''} />
                <InfoItem label="製品/部品" value={detail.classification || ''} />
                <InfoItem label="最終更新者" value={detail.updater || ''} />
            </div>

            <div style={sectionTitleStyle}>■パレット番号一覧</div>
            <ResultGrid<PalletRow>
                columnDefs={palletColumnDefs}
                rowData={pallets}
                noRowsShow="パレット番号がありません。"
            />

            <div style={sectionTitleStyle}>■移動履歴</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px' }}>パレット番号で絞り込み</span>
                <Select
                    size="small"
                    displayEmpty
                    value={palletFilter}
                    onChange={(event) => setPalletFilter(String(event.target.value))}
                    sx={{ height: 32, minWidth: 180, fontSize: 14, backgroundColor: '#ffffff' }}
                >
                    <MenuItem value="" sx={{ fontSize: 14 }}>
                        {' '}
                    </MenuItem>
                    {pallets.map((row) => (
                        <MenuItem key={row.palletNo} value={row.palletNo} sx={{ fontSize: 14 }}>
                            {row.palletNo}
                        </MenuItem>
                    ))}
                </Select>
            </div>

            {visibleGroups.map((group) => (
                <div key={group.palletNo} style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '14px', marginBottom: '6px' }}>パレット番号：{group.palletNo}</div>
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '14px', marginBottom: '8px' }}>
                        <span>保管期間：{group.storagePeriod || ''}</span>
                        <span>保管場所：{group.place || ''}</span>
                    </div>
                    <ResultGrid<HistoryRow>
                        columnDefs={historyColumnDefs}
                        rowData={group.rows || []}
                        noRowsShow="移動履歴がありません。"
                    />
                </div>
            ))}

            <div style={{ marginTop: '8px' }}>
                <button type="button" style={backButtonStyle} onClick={() => navigate(-1)}>
                    戻る
                </button>
            </div>
        </PageContainer>
    );
};

export default P502;
