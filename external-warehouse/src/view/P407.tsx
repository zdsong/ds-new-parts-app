import React, { useMemo } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm } from 'react-admin';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ColDef } from 'ag-grid-community';

import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import DataGrid from '../compontent/DataGrid';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';

/**
 * 移動情報詳細画面（P407）
 *
 * 画面イメージ：③移動管理 3. 移動登録情報を確認する
 *   移動状況が「移動登録完了」の場合と、「移動完了」の場合の 2 状態。
 *   「移動完了」は /P407?status=complete で開く。
 *
 * 基本情報の移動元・移動先は、それぞれ倉庫とロケ番の 2 つの選択欄を並べる。
 * バックエンドは未接続。表示は設計書の画面イメージに合わせた仮データ。
 */

/** 品目明細 */
interface DetailRow {
    id: string;
    itemCode: string;
    itemName: string;
    /** 保管数 */
    stockQty: number;
    /** 移動数 */
    moveQty: number;
    palletNo: string;
}

/** 移動状況 */
type MoveInfoStatus = 'registered' | 'complete';

// 倉庫の選択肢
const WAREHOUSE_CHOICES = [
    { key: '1', value: '行田工場' },
    { key: '2', value: '外部倉庫' },
];

// ロケ番の選択肢（⑤ロケ番マスタの形式に合わせた仮データ）
const LOCATION_CHOICES = [
    { key: 'A-1-2-3-4', value: 'A-1-2-3-4' },
    { key: 'A-1-2-3-5', value: 'A-1-2-3-5' },
    { key: 'B-1-1-1-1', value: 'B-1-1-1-1' },
    { key: 'B-2-2-2-2', value: 'B-2-2-2-2' },
];

/** 設計書の品目一覧（保管数、移動数の順） */
const DETAIL_ROWS: DetailRow[] = [
    {
        id: '1',
        itemCode: 'GP20A-101-RN-NAV3-00',
        itemName: 'アルミ支柱A',
        stockQty: 100,
        moveQty: 50,
        palletNo: 'B261010-001',
    },
    {
        id: '2',
        itemCode: 'TLR560LB-S400-200-00',
        itemName: 'H400 本体ASSY',
        stockQty: 100,
        moveQty: 100,
        palletNo: 'B261010-002',
    },
];

/** 移動登録（どちらの状態でも表示する） */
const REGISTERED = {
    registrar: '佐藤太郎（外部倉庫）',
    palletNo: 'B261015-001',
    registeredAt: '2026/10/15 10:00',
    remark: 'XXXXXXXXXXXXXX',
};

/** 移動状況が「移動完了」のときの移動登録完了 */
const COMPLETED = {
    registrar: '佐々木太郎（物流）',
    completedAt: '2026/10/16 10:00',
    remark: 'XXXXXXXXXXXXXX',
};

/** 節見出し（■） */
const sectionTitleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 700,
    margin: '18px 0 10px',
};

/** 移動登録・移動登録完了の枠 */
const panelStyle: React.CSSProperties = {
    border: '1px solid #bdbdbd',
    padding: '16px 18px 14px',
};

/** 枠内のラベルと値 */
const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    minHeight: '32px',
    gap: '1.5rem',
};

const infoLabelStyle: React.CSSProperties = {
    width: '7.5rem',
    flexShrink: 0,
};

/** 枠の右下に置くボタン */
const panelButtonStyle: React.CSSProperties = {
    ...buttonSx.button,
    width: 'auto',
    minWidth: '140px',
    backgroundColor: '#333333',
};

/** 戻る（設計書の薄い青） */
const backButtonStyle: React.CSSProperties = {
    ...buttonSx.button,
    backgroundColor: '#5b9bd5',
};

/** 倉庫とロケ番をラベルの右に並べる */
const WarehouseLocation: React.FC<{
    label: string;
    warehouseSource: string;
    locationSource: string;
}> = ({ label, warehouseSource, locationSource }) => (
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
            source={warehouseSource}
            label={label}
            choices={WAREHOUSE_CHOICES}
            sx={{
                display: 'contents',
                label: { width: '150px', flexShrink: 0 },
                input: { width: '100%', minWidth: 0 },
            }}
        />
        <FormInput
            type={'filter-select'}
            source={locationSource}
            label={false}
            choices={LOCATION_CHOICES}
            sx={{
                width: '100%',
                minWidth: 0,
                flex: 'none',
                marginTop: 0,
                input: { width: '100%', minWidth: 0 },
            }}
        />
    </div>
);

/** 枠内の「項目名＋文言」 */
const InfoText: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={infoRowStyle}>
        <span style={infoLabelStyle}>{label}</span>
        <span>{value}</span>
    </div>
);

const P407: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const status: MoveInfoStatus = searchParams.get('status') === 'complete' ? 'complete' : 'registered';
    const completed = status === 'complete';

    const formDefaults = useMemo(
        () => ({
            moveNo: '260001000',
            statusLabel: completed ? '移動完了' : '移動登録完了',
            palletNo: REGISTERED.palletNo,
            sourceWarehouse: '2',
            sourceLocation: 'A-1-2-3-4',
            destWarehouse: '1',
            destLocation: 'A-1-2-3-4',
            remark: REGISTERED.remark,
            completeRemark: completed ? COMPLETED.remark : '',
        }),
        [completed]
    );

    const detailColumnDefs = useMemo<ColDef<DetailRow>[]>(
        () => [
            {
                headerName: 'No',
                width: 70,
                valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
                cellStyle: { justifyContent: 'center' },
            },
            { headerName: '品目コード', field: 'itemCode', width: 230 },
            { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 180 },
            {
                headerName: '保管数',
                field: 'stockQty',
                width: 110,
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '移動数',
                field: 'moveQty',
                width: 110,
                cellStyle: { justifyContent: 'flex-end' },
            },
            { headerName: 'パレット番号', field: 'palletNo', width: 160 },
        ],
        []
    );

    return (
        <PageContainer title="移動情報詳細" titleUnderline bottomSpace>
            <div style={sectionTitleStyle}>■基本情報</div>
            <SimpleForm
                key={`basic-${status}`}
                sx={formSx.formContainer}
                onSubmit={() => undefined}
                toolbar={false}
                defaultValues={formDefaults}
            >
                <div style={formSx.form2}>
                    <FormInput type={'text'} source="moveNo" label="移動番号" readOnly />
                    <FormInput type={'text'} source="statusLabel" label="移動状況" readOnly />
                    <FormInput type={'text'} source="palletNo" label="パレット番号" readOnly />
                    <div />
                    <WarehouseLocation
                        label="移動元"
                        warehouseSource="sourceWarehouse"
                        locationSource="sourceLocation"
                    />
                    <WarehouseLocation
                        label="移動先"
                        warehouseSource="destWarehouse"
                        locationSource="destLocation"
                    />
                </div>
            </SimpleForm>

            <div style={sectionTitleStyle}>■移動登録</div>
            <div style={panelStyle}>
                <SimpleForm
                    key={`registered-${status}`}
                    sx={formSx.formContainer}
                    onSubmit={() => undefined}
                    toolbar={false}
                    defaultValues={formDefaults}
                >
                    <div style={formSx.form2}>
                        <InfoText label="移動登録者" value={REGISTERED.registrar} />
                        <InfoText label="移動登録日時" value={REGISTERED.registeredAt} />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormInput
                                type={'text'}
                                source="remark"
                                label="備考"
                                multiline
                                inputHeight={80}
                                readOnly
                            />
                        </div>
                    </div>
                </SimpleForm>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button type="button" style={panelButtonStyle} title="移動登録削除機能は未実装です">
                        移動登録削除
                    </button>
                </div>
            </div>

            <div style={sectionTitleStyle}>■移動登録完了</div>
            <div style={panelStyle}>
                <SimpleForm
                    key={`complete-${status}`}
                    sx={formSx.formContainer}
                    onSubmit={() => undefined}
                    toolbar={false}
                    defaultValues={formDefaults}
                >
                    <div style={formSx.form2}>
                        <InfoText label="移動登録者" value={completed ? COMPLETED.registrar : ''} />
                        <InfoText label="移動登録日時" value={completed ? COMPLETED.completedAt : ''} />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormInput
                                type={'text'}
                                source="completeRemark"
                                label="備考"
                                multiline
                                inputHeight={80}
                                readOnly
                            />
                        </div>
                    </div>
                </SimpleForm>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                        type="button"
                        style={completed ? panelButtonStyle : { ...buttonSx.disabledButton, width: 'auto', minWidth: '140px' }}
                        disabled={!completed}
                        title="移動完了取消機能は未実装です"
                    >
                        移動完了取消
                    </button>
                </div>
            </div>

            <div style={sectionTitleStyle}>■品目一覧</div>
            <style>{`
                .move-info-grid .ag-center-cols-viewport,
                .move-info-grid .ag-center-cols-clipper {
                    min-height: 0 !important;
                }
            `}</style>
            <div className="ag-theme-alpine move-info-grid" style={tableSx.tableContainer}>
                <DataGrid<DetailRow>
                    columnDefs={detailColumnDefs}
                    rowData={DETAIL_ROWS}
                    page={1}
                    pageSize={DETAIL_ROWS.length}
                    onPageChange={() => undefined}
                    rowUniqueKey="id"
                    selectionMode="none"
                    rowHeight={38}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px' }}>
                <button type="button" style={backButtonStyle} onClick={() => navigate(-1)}>
                    戻る
                </button>
                <button type="button" style={buttonSx.button} title="更新機能は未実装です">
                    更新
                </button>
            </div>
        </PageContainer>
    );
};

export default P407;
