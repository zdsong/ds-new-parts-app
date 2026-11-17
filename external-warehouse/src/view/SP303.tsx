import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpQuantityInput from '../compontent/SpQuantityInput';
import { spFormInputSx, spSx } from '../styles/spSx';
import {
    CATEGORY_CHOICES,
    LOCATION_CHOICES,
    STORAGE_CHOICES,
    generatePalletNo,
    normalizeChoiceValue,
    printPalletLabels,
} from '../utils/palletData';
import type { PalletDetailItem, PalletFormData } from '../utils/palletData';

/**
 * パレット番号発番画面（SP303）
 *
 * 設計書：①パレット番号管理 3.3 パレット番号発番
 *   品目検索（SP302）で追加した品目と、保管倉庫・ロケ番・備考を確認して発番する。
 *   発番後はパレット情報詳細（SP305）へ遷移し、パレット番号表の印刷が可能になる。
 */
interface Sp303State {
    category?: string;
    details?: PalletDetailItem[];
    pallet?: PalletFormData;
}

/** カード内の縦積みレイアウト（SP302 と同じ並びに揃える） */
const formColumn: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    minWidth: 0,
};

const SP303: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const notify = useNotify();

    const state = (location.state || {}) as Sp303State;

    // 基本情報の初期値
    const [pallet, setPallet] = useState<PalletFormData>({
        palletNo: state.pallet?.palletNo || '',
        category: state.pallet?.category || state.category || '1',
        storageLocation: state.pallet?.storageLocation || '1',
        locationNo: state.pallet?.locationNo || 'A-01-03-02',
        remark: state.pallet?.remark || '',
    });
    // 積載明細
    const [details, setDetails] = useState<PalletDetailItem[]>(state.details || []);
    // フォーム再描画用の世代番号
    const [formKey, setFormKey] = useState(0);

    /** 数量を変更する */
    const handleQuantityChange = (id: string, value: number) => {
        setDetails((prev) =>
            prev.map((detail) => (detail.id === id ? { ...detail, quantity: value } : detail))
        );
    };

    /** 積載明細を削除する */
    const handleRemove = (id: string) => {
        setDetails((prev) => prev.filter((detail) => detail.id !== id));
    };

    /** 品目検索（SP302）へ戻って品目を追加する */
    const handleAddItem = () => {
        navigate('/SP302', {
            state: {
                category: pallet.category,
                details,
                pallet,
                returnTo: '/SP303',
            },
        });
    };

    /** 発番する */
    const handleIssue = (values: any) => {
        if (details.length === 0) {
            notify('積載する品目を追加してください。', { type: 'warning' });
            return;
        }

        const nextPallet: PalletFormData = {
            palletNo: pallet.palletNo || generatePalletNo(),
            category: normalizeChoiceValue(values?.category) || pallet.category,
            storageLocation: normalizeChoiceValue(values?.storageLocation) || '1',
            locationNo: normalizeChoiceValue(values?.locationNo) || '',
            remark: values?.remark || '',
        };

        setPallet(nextPallet);
        notify(`パレット番号 ${nextPallet.palletNo} を発番しました。`, { type: 'success' });

        // 発番後はパレット情報詳細へ遷移する（発番内容と積載明細を引き継ぐ）
        navigate('/SP305', { state: { pallet: nextPallet, details } });
    };

    /** 番号表を印刷する（発番済みの場合のみ） */
    const handlePrint = () => {
        if (!pallet.palletNo) {
            notify('発番後に番号表を印刷できます。', { type: 'warning' });
            return;
        }
        const count = printPalletLabels([{ ...pallet, details }]);
        if (count === 0) {
            notify('印刷用ウィンドウを開けませんでした。ポップアップブロックを解除してください。', {
                type: 'warning',
            });
        }
    };

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー（右：番号表印刷） */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>パレット番号発番</label>
                <Typography
                    sx={pallet.palletNo ? spSx.actionLink : spSx.actionLinkDisabled}
                    component="span"
                    onClick={handlePrint}
                >
                    番号表印刷
                </Typography>
            </Box>

            {/* 基本情報（SP302 と同じく、見出しもカード内に置く） */}
            <Box sx={spSx.card}>
                <SimpleForm
                    key={formKey}
                    id="sp303-form"
                    sx={{ width: '100%', padding: '0' }}
                    onSubmit={handleIssue}
                    toolbar={false}
                    defaultValues={pallet}
                >
                    <div style={formColumn}>
                        <div style={spSx.sectionTitle}>■基本情報</div>
                        <FormInput
                            type={'text'}
                            source="palletNo"
                            label="パレット番号"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            readOnly
                            placeholder="未発番"
                            defaultValue={pallet.palletNo || '未発番'}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="category"
                            label="製品／部品"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={CATEGORY_CHOICES}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="storageLocation"
                            label="保管倉庫"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={STORAGE_CHOICES}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="locationNo"
                            label="保管エリア（ロケ番）"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={LOCATION_CHOICES}
                        />
                        <FormInput
                            type={'text'}
                            source="remark"
                            label="備考"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            multiline
                            placeholder="入力してください"
                        />
                    </div>
                </SimpleForm>
            </Box>

            {/* 追加品目 */}
            <Box sx={{ ...spSx.sectionTitle, justifyContent: 'space-between' }}>
                <span>{`■追加品目：${details.length}件`}</span>
                <span style={spSx.link} onClick={handleAddItem}>
                    ＋品目追加
                </span>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {details.length === 0 ? (
                    <div style={spSx.empty}>積載する品目が登録されていません。</div>
                ) : (
                    details.map((detail, index) => (
                        <div key={detail.id} style={spSx.itemCard}>
                            {/* 数量は FormInput を使うため、カードごとにフォームを持つ */}
                            <SimpleForm
                                id={`sp303-item-${detail.id}`}
                                sx={{ width: '100%', padding: '0' }}
                                onSubmit={() => {}}
                                toolbar={false}
                                defaultValues={detail}
                            >
                                <div style={{ ...formColumn, gap: '6px' }}>
                                    <div style={spSx.itemHeader}>
                                        <span style={spSx.itemTitle}>{`No.${index + 1}`}</span>
                                        <span
                                            style={spSx.linkDanger}
                                            onClick={() => handleRemove(detail.id)}
                                        >
                                            削除
                                        </span>
                                    </div>
                                    <div style={spSx.row}>
                                        <span style={spSx.rowLabelFixed}>品目コード</span>
                                        <span style={spSx.rowValue}>{detail.itemCode}</span>
                                    </div>
                                    <div style={spSx.row}>
                                        <span style={spSx.rowLabelFixed}>品目名</span>
                                        <span style={spSx.rowValue}>{detail.itemName}</span>
                                    </div>
                                    {/* 数量は SP305 の明細カードと同じ入力枠（－ 入力 ＋）にする */}
                                    <div style={{ ...spSx.row, alignItems: 'center' }}>
                                        <span style={spSx.rowLabelFixed}>数量</span>
                                        <SpQuantityInput
                                            value={detail.quantity}
                                            onChange={(value) =>
                                                handleQuantityChange(detail.id, value)
                                            }
                                        />
                                    </div>
                                </div>
                            </SimpleForm>
                        </div>
                    ))
                )}
            </Box>

            {/* 操作ボタン */}
            <Box sx={spSx.buttonBar}>
                <button
                    style={spSx.secondaryButton}
                    type="button"
                    onClick={() => {
                        setPallet({
                            palletNo: '',
                            category: '1',
                            storageLocation: '1',
                            locationNo: 'A-01-03-02',
                            remark: '',
                        });
                        setDetails([]);
                        setFormKey((key) => key + 1);
                    }}
                >
                    リセット
                </button>
                <button style={spSx.primaryButton} type="submit" form="sp303-form">
                    発番
                </button>
            </Box>
        </Box>
    );
};

export default SP303;
