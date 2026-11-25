import React, { useCallback, useEffect, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { useNotify } from 'react-admin';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ColDef } from 'ag-grid-community';

import useApiRequest from '../adapters/apiUtil';
import PageContainer from '../compontent/PageContainer';
import ResultGrid from '../compontent/ResultGrid';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';

/**
 * 移動情報詳細画面（P407）
 *
 * 設計書：③移動管理 3. 移動登録情報を確認する
 *   移動状況が「移動登録完了」の場合と、「移動完了」の場合の 2 状態。
 *   移動一覧（SP407）で移動番号を選ぶと ?moveNo=移動番号 で開く。
 *   表示内容は移動管理（bss_transfer／bss_transfer_detail）から取得する。
 */

/** 品目明細 */
interface DetailRow {
    id: string;
    detailNo: number;
    itemCode: string;
    itemName: string;
    classification: string;
    /** 保管数 */
    stockQty: number;
    /** 移動数 */
    moveQty: number;
    sourcePalletNo: string;
    destPalletNo: string;
    requestNo: string;
}

/** 移動情報詳細 API の明細行 */
interface ApiMoveDetailLine {
    detailNo?: number;
    itemCode?: string;
    itemName?: string;
    classification?: string;
    storageQty?: number | string;
    moveQty?: number | string;
    sourcePalletNo?: string;
    destPalletNo?: string;
    transferRequestNo?: string;
}

/** 移動情報詳細 API のレスポンス */
interface ApiMoveDetail {
    transferNo?: string;
    status?: string;
    statusLabel?: string;
    sourceWhCd?: string;
    sourceWarehouse?: string;
    sourceLocCd?: string;
    destWhCd?: string;
    destWarehouse?: string;
    destLocCd?: string;
    sourcePalletNo?: string;
    destPalletNo?: string;
    registrar?: string;
    registeredDate?: string;
    completer?: string;
    completedDate?: string;
    memo?: string;
    completionMemo?: string;
    details?: ApiMoveDetailLine[];
}

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

/** 枠内の「項目名＋文言」 */
const InfoText: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={infoRowStyle}>
        <span style={infoLabelStyle}>{label}</span>
        <span>{value || '－'}</span>
    </div>
);

/** 参照専用の複数行入力枠 */
const InfoMemo: React.FC<{ value: string }> = ({ value }) => (
    <div
        style={{
            minHeight: '80px',
            border: '1px solid #bdbdbd',
            padding: '8px 10px',
            whiteSpace: 'pre-wrap',
            backgroundColor: '#ffffff',
        }}
    >
        {value || ''}
    </div>
);

const P407: React.FC = () => {
    const navigate = useNavigate();
    const notify = useNotify();
    const { request } = useApiRequest();
    const [searchParams] = useSearchParams();
    const moveNo = (searchParams.get('moveNo') || '').trim();
    const [detail, setDetail] = useState<ApiMoveDetail | null>(null);

    /** 移動情報詳細を取得する */
    const loadDetail = useCallback(async () => {
        if (!moveNo) {
            return;
        }
        try {
            const result = await request(
                'get',
                'api/transfer/move/detail',
                {},
                { transferNo: moveNo },
                true,
                false
            );
            setDetail(result?.data || null);
        } catch (error) {
            console.error(error);
            notify('notify.transfer.fetch_failed', { type: 'error' });
        }
    }, [moveNo, notify, request]);

    useEffect(() => {
        loadDetail();
    }, [loadDetail]);

    const completed = detail?.status === 'TF_F';

    const detailRows = useMemo<DetailRow[]>(
        () =>
            (detail?.details || []).map((line, index) => ({
                id: String(line.detailNo ?? index + 1),
                detailNo: line.detailNo ?? index + 1,
                itemCode: line.itemCode || '',
                itemName: line.itemName || '',
                classification: line.classification || '',
                stockQty: Number(line.storageQty ?? 0),
                moveQty: Number(line.moveQty ?? 0),
                sourcePalletNo: line.sourcePalletNo || '',
                destPalletNo: line.destPalletNo || '',
                requestNo: line.transferRequestNo || '',
            })),
        [detail]
    );

    const detailColumnDefs = useMemo<ColDef<DetailRow>[]>(
        () => [
            { headerName: 'No', field: 'detailNo', width: 70, cellStyle: { justifyContent: 'center' } },
            { headerName: '品目コード', field: 'itemCode', width: 230 },
            { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 180 },
            { headerName: '製品／部品', field: 'classification', width: 120 },
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
            { headerName: '移動元パレット番号', field: 'sourcePalletNo', width: 170 },
            { headerName: '移動先パレット番号', field: 'destPalletNo', width: 170 },
            { headerName: '移動依頼番号', field: 'requestNo', width: 160 },
        ],
        []
    );

    return (
        <PageContainer title="移動情報詳細" titleUnderline bottomSpace>
            <div style={sectionTitleStyle}>■基本情報</div>
            <div style={formSx.form2}>
                <InfoText label="移動番号" value={moveNo} />
                <InfoText label="移動状況" value={detail?.statusLabel || ''} />
                <InfoText
                    label="移動依頼番号"
                    value={detail?.details?.find((line) => line.transferRequestNo)?.transferRequestNo || ''}
                />
                <InfoText label="パレット番号" value={detail?.destPalletNo || ''} />
                <InfoText
                    label="移動元"
                    value={[detail?.sourceWarehouse, detail?.sourceLocCd].filter(Boolean).join(' / ')}
                />
                <InfoText
                    label="移動先"
                    value={[detail?.destWarehouse, detail?.destLocCd].filter(Boolean).join(' / ')}
                />
            </div>

            <div style={sectionTitleStyle}>■移動登録</div>
            <div style={panelStyle}>
                <div style={formSx.form2}>
                    <InfoText label="移動登録者" value={detail?.registrar || ''} />
                    <InfoText label="移動登録日時" value={detail?.registeredDate || ''} />
                    <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ ...infoLabelStyle, width: 'auto', marginBottom: '6px' }}>備考</div>
                        <InfoMemo value={detail?.memo || ''} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button type="button" style={panelButtonStyle} disabled title="移動登録削除機能は未実装です">
                        移動登録削除
                    </button>
                </div>
            </div>

            <div style={sectionTitleStyle}>■移動登録完了</div>
            <div style={panelStyle}>
                <div style={formSx.form2}>
                    <InfoText label="移動完了者" value={completed ? detail?.completer || '' : ''} />
                    <InfoText label="移動完了日時" value={completed ? detail?.completedDate || '' : ''} />
                    <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ ...infoLabelStyle, width: 'auto', marginBottom: '6px' }}>備考</div>
                        <InfoMemo value={completed ? detail?.completionMemo || '' : ''} />
                    </div>
                </div>
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
                <ResultGrid<DetailRow>
                    columnDefs={detailColumnDefs}
                    rowData={detailRows}
                    page={1}
                    pageSize={Math.max(detailRows.length, 1)}
                    onPageChange={() => undefined}
                    rowUniqueKey="id"
                    selectionMode="none"
                    rowHeight={38}
                    noRowsShow={moveNo ? '該当する移動情報がありません。' : '移動番号が指定されていません。'}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px' }}>
                <button type="button" style={backButtonStyle} onClick={() => navigate(-1)}>
                    戻る
                </button>
                <button type="button" style={buttonSx.button} title="更新機能は未実装です" disabled>
                    更新
                </button>
            </div>
        </PageContainer>
    );
};

export default P407;
