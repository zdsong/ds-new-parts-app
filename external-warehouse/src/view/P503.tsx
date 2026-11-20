import React, { useMemo } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import PageContainer from '../compontent/PageContainer';
import ResultGrid from '../compontent/ResultGrid';
import { buttonSx, tableSx } from '../styles/commonSX';

/**
 * 在庫詳細（ロケ番）画面（P503）
 *
 * 画面イメージ：④在庫管理 在庫詳細（ロケーション）
 * 画面タイトルは設計書の「在庫詳細（品目）」ではなく「在庫詳細（ロケ番）」とする。
 * バックエンドは未接続。表示は設計書の画面イメージに合わせた仮データ。
 */

/** パレットに載っている品目 */
interface PalletItemRow {
    id: string;
    itemCode: string;
    itemName: string;
    storageType: string;
    quantity: number;
    usable: string;
}

/** ロケ番にあるパレット */
interface PalletGroup {
    palletNo: string;
    storagePeriod: string;
    items: PalletItemRow[];
}

const PALLET_GROUPS: PalletGroup[] = [
    {
        palletNo: 'B260528-001',
        storagePeriod: '6ヵ月',
        items: [
            {
                id: '1',
                itemCode: 'MB33S-212-00',
                itemName: '止水板1',
                storageType: '稼働',
                quantity: 400,
                usable: '使用可',
            },
        ],
    },
    {
        palletNo: 'B250401-001',
        storagePeriod: '1年7ヵ月',
        items: [
            {
                id: '2',
                itemCode: 'MB33S-207-01',
                itemName: 'シーズ材2',
                storageType: '稼働',
                quantity: 160,
                usable: '使用可',
            },
            {
                id: '3',
                itemCode: 'MB33S-207-02',
                itemName: 'XXXXXXX',
                storageType: '稼働',
                quantity: 160,
                usable: '使用可',
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

const P503: React.FC = () => {
    const navigate = useNavigate();

    const columnDefs = useMemo<ColDef<PalletItemRow>[]>(
        () => [
            { headerName: '品目コード', field: 'itemCode', width: 170 },
            { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 160 },
            { headerName: '保管区分', field: 'storageType', width: 120 },
            {
                headerName: '保管数',
                field: 'quantity',
                width: 110,
                cellStyle: { justifyContent: 'flex-end' },
            },
            { headerName: '使用可否', field: 'usable', width: 120 },
        ],
        []
    );

    return (
        <PageContainer title="在庫詳細（ロケ番）">
            <div style={sectionTitleStyle}>■基本情報</div>
            <div style={infoGridStyle}>
                <InfoItem label="保管倉庫" value="外部倉庫" />
                <InfoItem label="ロケ番" value="A-1-2-3-4" />
                <InfoItem label="最終更新者" value="山田 太郎（物流）" />
                <InfoItem label="最終更新日時" value="2026/10/01 15:00" />
            </div>

            <div style={sectionTitleStyle}>■パレット番号一覧</div>
            {PALLET_GROUPS.map((group) => (
                <div key={group.palletNo} style={{ marginBottom: '18px' }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            columnGap: '4rem',
                            maxWidth: '920px',
                            marginBottom: '8px',
                            fontSize: '14px',
                        }}
                    >
                        <div style={infoItemStyle}>
                            <span>パレット番号</span>
                            <span style={linkStyle}>{group.palletNo}</span>
                        </div>
                        <div style={infoItemStyle}>
                            <span>保管期間</span>
                            <span>{group.storagePeriod}</span>
                        </div>
                    </div>
                    <ResultGrid<PalletItemRow>
                        columnDefs={columnDefs}
                        rowData={group.items}
                        noRowsShow="品目がありません。"
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

export default P503;
