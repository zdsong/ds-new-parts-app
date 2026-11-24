import React from 'react';
import { Box } from '@mui/material';
import { useNotify } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import { spSx } from '../styles/spSx';
import { HOME_ROUTE } from '../utils/appRoutes';
import { REGISTER_WITH_DEPENDENCY, completeMoveRegistration, moveWarehouseLabel } from '../utils/moveData';
import type { MoveCompleteState } from '../utils/moveData';
import { printPalletLabels } from '../utils/palletData';
import type { PalletDetailItem } from '../utils/palletData';

/**
 * 移動登録完了画面（SP405）
 *
 * 設計書：③移動管理 1-4 パレット番号表印刷。
 * 移動登録（SP402）の確定後に開く。番号表印刷は画面側だけで行う。
 */

/** カード内の項目（項目名＋値の縦積み） */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={spSx.field}>
        <span style={spSx.fieldLabel}>{label}</span>
        <span style={spSx.fieldValue}>{children}</span>
    </div>
);

/** 画面を直接開いたときの確認用（依存ありの登録結果） */
const SAMPLE_COMPLETE: MoveCompleteState = completeMoveRegistration({
    mode: 'issue',
    palletNo: '',
    destinationWh: 'gyoda',
    destinationLoc: 'A-1-2-3-4',
    remark: 'XXXXXXXXXXXXXXX',
    lines: REGISTER_WITH_DEPENDENCY.lines,
});

const SP405: React.FC = () => {
    const navigate = useNavigate();
    const notify = useNotify();
    const location = useLocation();
    const incoming = location.state as MoveCompleteState | null;
    const result = incoming?.moveNo && incoming.lines ? incoming : SAMPLE_COMPLETE;
    const destinationWhName = result.destinationWhNm || moveWarehouseLabel(result.destinationWh);
    const destination = `${destinationWhName}/${result.destinationLoc}`;

    const handlePrint = () => {
        const details: PalletDetailItem[] = result.lines.map((line) => ({
            id: line.id,
            itemCode: line.itemCode,
            itemName: line.itemName,
            productGroup: '',
            arrangementNo: '',
            storageCapacity: '',
            quantity: line.moveQty,
            remark: '',
            storageCategory: '',
            usableFlag: '0',
            createdAt: '',
            createdBy: '',
            updatedAt: '',
            updatedBy: '',
        }));
        const count = printPalletLabels(
            [
                {
                    palletNo: result.palletNo,
                    category: result.lines[0]?.category || '3',
                    storageLocationName: destinationWhName,
                    details,
                },
            ],
            null,
            () => notify('この端末では印刷ダイアログを開けません。', { type: 'warning' })
        );
        if (count === 0) {
            notify('印刷できるパレットがありません。', { type: 'warning' });
        }
    };

    return (
        <Box sx={spSx.page}>
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>移動登録完了</label>
            </Box>
            <Box sx={spSx.titleActionBar}>
                <Box component="button" type="button" sx={spSx.actionButton} onClick={handlePrint}>
                    番号表印刷
                </Box>
            </Box>
            <Box sx={spSx.sectionTitle}>■基本情報</Box>
            <Box sx={spSx.card}>
                <Field label="移動番号">{result.moveNo}</Field>
                <Field label="パレット番号">{result.palletNo}</Field>
                <Field label="移動先">{destination}</Field>
            </Box>
            <Box sx={spSx.sectionTitle}>{`■追加品目（${result.lines.length}件）`}</Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.lines.map((line) => (
                    <div key={line.id} style={spSx.listCard}>
                        <Field label="品目コード">{line.itemCode}</Field>
                        <Field label="品目名">{line.itemName}</Field>
                        <Field label="移動数量/保管数量">{`${line.moveQty} / ${line.storageQty}`}</Field>
                        <Field label="パレット番号">{line.palletNo}</Field>
                        <Field label="保管場所">{line.storagePlace}</Field>
                    </div>
                ))}
            </Box>
            <Box sx={spSx.card}>
                <Field label="備考">{result.remark || '－'}</Field>
                <Field label="移動登録者">{result.registrar}</Field>
            </Box>
            <Box sx={{ display: 'flex', gap: '12px' }}>
                <button type="button" style={spSx.secondaryButton} onClick={() => navigate(HOME_ROUTE)}>
                    TOPに戻る
                </button>
                <button type="button" style={spSx.primaryButton} onClick={() => navigate('/SP401')}>
                    スキャン
                </button>
            </Box>
        </Box>
    );
};

export default SP405;
