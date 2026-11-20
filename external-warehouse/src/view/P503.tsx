import React, { useEffect, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { ColDef } from 'ag-grid-community';
import { useNavigate, useSearchParams } from 'react-router-dom';

import useApiRequest from '../adapters/apiUtil';
import PageContainer from '../compontent/PageContainer';
import ResultGrid from '../compontent/ResultGrid';
import { buttonSx, tableSx } from '../styles/commonSX';

/**
 * 在庫詳細（ロケ番）画面（P503）
 *
 * 画面イメージ：④在庫管理 在庫詳細（ロケーション）
 * 画面タイトルは「在庫詳細（ロケ番）」。
 * 在庫一覧（P501）のロケ番から、倉庫コードとロケコードを渡して開く。
 */

/** パレットに載っている品目 */
interface PalletItemRow {
    id: string;
    itemCode: string;
    itemName: string;
    storageType: string;
    quantity: number | string;
    usable: string;
}

/** ロケ番にあるパレット */
interface PalletGroup {
    palletNo: string;
    storagePeriod: string;
    items: PalletItemRow[];
}

/** ロケ番の在庫詳細 */
interface LocationDetail {
    warehouse: string;
    location: string;
    updater: string;
    updatedAt: string;
    pallets: PalletGroup[];
}

const EMPTY_DETAIL: LocationDetail = {
    warehouse: '',
    location: '',
    updater: '',
    updatedAt: '',
    pallets: [],
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

/** 末尾の 0 を除いた数量 */
const formatQuantity = (value: unknown) => {
    if (value == null || value === '') {
        return '';
    }
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : String(value);
};

const P503: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const whCd = searchParams.get('whCd') || '';
    const locCd = searchParams.get('locCd') || '';
    const { request } = useApiRequest();
    const [detail, setDetail] = useState<LocationDetail>(EMPTY_DETAIL);

    useEffect(() => {
        const load = async () => {
            if (!whCd || !locCd) {
                setDetail(EMPTY_DETAIL);
                return;
            }
            const result = await request('get', 'api/inventory/location', {}, { whCd, locCd }, true, false);
            const data = result?.data;
            setDetail(data && typeof data === 'object' ? data : EMPTY_DETAIL);
        };
        load();
    }, [locCd, request, whCd]);

    const columnDefs = useMemo<ColDef<PalletItemRow>[]>(
        () => [
            { headerName: '品目コード', field: 'itemCode', width: 170 },
            { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 160 },
            { headerName: '保管区分', field: 'storageType', width: 120 },
            {
                headerName: '保管数',
                field: 'quantity',
                width: 110,
                valueFormatter: (params) => formatQuantity(params.value),
                cellStyle: { justifyContent: 'flex-end' },
            },
            { headerName: '使用可否', field: 'usable', width: 120 },
        ],
        []
    );

    const pallets = detail.pallets || [];

    return (
        <PageContainer title="在庫詳細（ロケ番）">
            <div style={sectionTitleStyle}>■基本情報</div>
            <div style={infoGridStyle}>
                <InfoItem label="保管倉庫" value={detail.warehouse || ''} />
                <InfoItem label="ロケ番" value={detail.location || locCd} />
                <InfoItem label="最終更新者" value={detail.updater || ''} />
                <InfoItem label="最終更新日時" value={detail.updatedAt || ''} />
            </div>

            <div style={sectionTitleStyle}>■パレット番号一覧</div>
            {pallets.map((group) => (
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
                            <span>{group.storagePeriod || ''}</span>
                        </div>
                    </div>
                    <ResultGrid<PalletItemRow>
                        columnDefs={columnDefs}
                        rowData={group.items || []}
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
