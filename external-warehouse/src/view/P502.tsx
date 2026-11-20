import React, { useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { MenuItem, Select } from '@mui/material';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import PageContainer from '../compontent/PageContainer';
import ResultGrid from '../compontent/ResultGrid';
import { buttonSx, tableSx } from '../styles/commonSX';

/**
 * 在庫詳細（品目）画面（P502）
 *
 * 画面イメージ：④在庫管理 在庫詳細（品目）
 * 在庫一覧（P501）の品目から開く。
 * バックエンドは未接続。表示は設計書の画面イメージに合わせた仮データ。
 */

/** パレット番号一覧の 1 行 */
interface PalletRow {
    id: string;
    palletNo: string;
    warehouse: string;
    storageType: string;
    quantity: number;
    usable: string;
    remark: string;
}

/** 移動履歴の 1 行 */
interface HistoryRow {
    id: string;
    status: string;
    warehouse: string;
    quantity: string;
    usedQty: string;
    lostQty: string;
    discardQty: string;
    moveAt: string;
    requestNo: string;
    requestAt: string;
    requester: string;
    updatedAt: string;
    updater: string;
}

/** パレット単位の移動履歴 */
interface HistoryGroup {
    palletNo: string;
    storagePeriod: string;
    place: string;
    rows: HistoryRow[];
}

const PALLET_ROWS: PalletRow[] = [
    {
        id: '1',
        palletNo: 'B260528-001',
        warehouse: '行田工場',
        storageType: '稼働',
        quantity: 400,
        usable: '使用可',
        remark: '',
    },
    {
        id: '2',
        palletNo: 'B250401-001',
        warehouse: '行田工場',
        storageType: '稼働',
        quantity: 160,
        usable: '使用可',
        remark: '',
    },
];

const HISTORY_GROUPS: HistoryGroup[] = [
    {
        palletNo: 'B260528-001',
        storagePeriod: '0 ヵ月',
        place: '行田工場 A-1-2-3-4',
        rows: [
            {
                id: 'h1',
                status: '入庫',
                warehouse: '行田工場',
                quantity: '400',
                usedQty: '',
                lostQty: '',
                discardQty: '',
                moveAt: '',
                requestNo: '',
                requestAt: '',
                requester: '',
                updatedAt: '2026/10/01 14:00',
                updater: '佐藤 太郎（物流）',
            },
        ],
    },
    {
        palletNo: 'B250401-001',
        storagePeriod: '5 ヵ月',
        place: '行田工場 A-1-2-3-4',
        rows: [
            {
                id: 'h2',
                status: '移動予定',
                warehouse: '行田工場',
                quantity: '160',
                usedQty: '120',
                lostQty: '0',
                discardQty: '0',
                moveAt: '2026/08/09 15:00',
                requestNo: '261001-005',
                requestAt: '2026/10/01 15:00',
                requester: '山田 太郎（生産管理）',
                updatedAt: '2026/10/01 15:00',
                updater: '山田 太郎（生産管理）',
            },
            {
                id: 'h3',
                status: '移動完了',
                warehouse: '外部倉庫',
                quantity: '250',
                usedQty: '',
                lostQty: '',
                discardQty: '',
                moveAt: '2026/08/02 10:00',
                requestNo: '',
                requestAt: '',
                requester: '',
                updatedAt: '2026/08/10 15:00',
                updater: '加藤 花子（外部倉庫）',
            },
            {
                id: 'h4',
                status: '移動完了',
                warehouse: '行田工場',
                quantity: '280',
                usedQty: '20',
                lostQty: '0',
                discardQty: '0',
                moveAt: '2026/08/02 10:00',
                requestNo: '260601-001',
                requestAt: '2026/08/01 15:00',
                requester: '山田 太郎（生産管理）',
                updatedAt: '2026/08/03 09:00',
                updater: '佐藤 太郎（物流）',
            },
            {
                id: 'h5',
                status: '移動完了',
                warehouse: '外部倉庫',
                quantity: '300',
                usedQty: '',
                lostQty: '',
                discardQty: '',
                moveAt: '2026/04/01 11:30',
                requestNo: '',
                requestAt: '',
                requester: '',
                updatedAt: '2025/04/02 11:00',
                updater: '加藤 花子（外部倉庫）',
            },
            {
                id: 'h6',
                status: '入庫',
                warehouse: '行田工場',
                quantity: '300',
                usedQty: '',
                lostQty: '',
                discardQty: '',
                moveAt: '',
                requestNo: '',
                requestAt: '',
                requester: '',
                updatedAt: '2025/04/01 11:00',
                updater: '佐藤 太郎（物流）',
            },
        ],
    },
];

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

const P502: React.FC = () => {
    const navigate = useNavigate();
    const [palletFilter, setPalletFilter] = useState('');

    const visibleGroups = palletFilter
        ? HISTORY_GROUPS.filter((group) => group.palletNo === palletFilter)
        : HISTORY_GROUPS;

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
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '利用数',
                field: 'usedQty',
                width: 90,
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '紛失/破損数',
                field: 'lostQty',
                width: 120,
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
                <InfoItem label="品目コード" value="50TAP-002-00" />
                <InfoItem label="品目名" value="パッキンケース" />
                <InfoItem label="在庫数" value="560" />
                <InfoItem label="最終更新日時" value="2026/10/01 15:00" />
                <InfoItem label="製品/部品" value="部品" />
                <InfoItem label="最終更新者" value="山田 太郎（物流）" />
            </div>

            <div style={sectionTitleStyle}>■パレット番号一覧</div>
            <ResultGrid<PalletRow>
                columnDefs={palletColumnDefs}
                rowData={PALLET_ROWS}
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
                    {PALLET_ROWS.map((row) => (
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
                        <span>保管期間：{group.storagePeriod}</span>
                        <span>保管場所：{group.place}</span>
                    </div>
                    <ResultGrid<HistoryRow>
                        columnDefs={historyColumnDefs}
                        rowData={group.rows}
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
