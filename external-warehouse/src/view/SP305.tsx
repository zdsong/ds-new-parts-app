import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpQuantityInput from '../compontent/SpQuantityInput';
import { spFormInputSx, spItemFieldSx, spSx } from '../styles/spSx';
import {
    CATEGORY_CHOICES,
    LOCATION_CHOICES,
    SAMPLE_PALLET,
    STORAGE_CHOICES,
    STORAGE_CATEGORY_CHOICES,
    USABLE_CHOICES,
    formatDateTime,
    getLoginUserLabel,
    normalizeChoiceValue,
    printPalletLabels,
} from '../utils/palletData';
import type { PalletDetailItem, PalletFormData } from '../utils/palletData';

/**
 * パレット情報詳細画面（SP305）
 *
 * 設計書：①パレット番号管理 2.3／3.3 発番後（パレット情報詳細）
 *   発番済みパレットの内容を確認・修正し、パレット番号表を印刷する。
 *   パレット番号発番（SP303）／パレット番号一覧（SP304）から location.state で受け取る。
 *   直接開いた場合はサンプルデータを表示する（P305 と同じ考え方）。
 *
 * 設計書の画面構成：
 *   ・基本情報はカード内。項目はすべて入力枠（パレット番号も枠付きの表示）。
 *   ・追加品目のカードは 品目コード／品目名＝表示、数量＝「－ 入力 ＋」、
 *     保管区分／使用可否＝▼付きの入力枠。
 *   ・明細一覧の下に登録・更新の実行者と日時、ボタンは 削除／更新。
 */
interface Sp305State {
    pallet?: PalletFormData;
    details?: PalletDetailItem[];
}

/** カード内の縦積みレイアウト（SP302／SP303 と同じ並びに揃える） */
const formColumn: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    minWidth: 0,
};

/** 直接開いた場合に表示するサンプル明細 */
const SAMPLE_DETAILS: PalletDetailItem[] = [
    {
        id: 'sample-1',
        itemCode: 'TL07-P-2L-SK-00',
        itemName: 'Nasta Box FRONT ポスト（2戸用）',
        productGroup: '付属品',
        arrangementNo: '3130300777',
        storageCapacity: '0.320',
        quantity: 5,
        remark: '',
        storageCategory: '1',
        usableFlag: '1',
        createdAt: '2026/10/01 10:00',
        createdBy: '山田 太郎（123456）',
        updatedAt: '2026/10/01 10:00',
        updatedBy: '山田 太郎（123456）',
    },
];

const SP305: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const notify = useNotify();

    const state = (location.state || {}) as Sp305State;

    // 表示するパレット（遷移元から受け取れない場合はサンプル）
    const [pallet, setPallet] = useState<PalletFormData>(state.pallet || SAMPLE_PALLET);
    // 積載明細（数量・保管区分・使用可否を編集できる）
    const [details, setDetails] = useState<PalletDetailItem[]>(
        state.details && state.details.length > 0 ? state.details : SAMPLE_DETAILS
    );
    // フォームを初期値で再描画するための世代番号
    const [formKey, setFormKey] = useState(0);

    // ログインユーザー（登録者・更新者として表示する）
    const loginUser = getLoginUserLabel();
    // 登録・更新の実行者と日時（画面下部に固定表示する）
    const [registered, setRegistered] = useState(() => ({
        at: (state.details && state.details[0]?.createdAt) || SAMPLE_DETAILS[0].createdAt,
        by: (state.details && state.details[0]?.createdBy) || loginUser,
    }));
    const [updated, setUpdated] = useState(() => ({
        at: (state.details && state.details[0]?.updatedAt) || SAMPLE_DETAILS[0].updatedAt,
        by: (state.details && state.details[0]?.updatedBy) || loginUser,
    }));

    /** 番号表を印刷する */
    const handlePrint = () => {
        const count = printPalletLabels([{ ...pallet, details }]);
        if (count === 0) {
            notify('印刷用ウィンドウを開けませんでした。ポップアップブロックを解除してください。', {
                type: 'warning',
            });
        } else {
            notify(`${count} 枚のパレット番号表を印刷します。`, { type: 'success' });
        }
    };

    /** 品目検索（SP302）へ進んで品目を追加する */
    const handleAddItem = () => {
        navigate('/SP302', {
            state: {
                category: pallet.category,
                details,
                pallet,
                returnTo: '/SP305',
            },
        });
    };

    /** 積載明細を削除する */
    const handleRemove = (id: string) => {
        setDetails((prev) => prev.filter((detail) => detail.id !== id));
    };

    /** 数量を更新する（± の増減・直接入力のどちらもここに集約する） */
    const handleQuantityChange = (id: string, value: number) => {
        setDetails((prev) =>
            prev.map((detail) => (detail.id === id ? { ...detail, quantity: value } : detail))
        );
    };

    /** 保管区分・使用可否を更新する */
    const handleDetailSelect = (
        id: string,
        field: 'storageCategory' | 'usableFlag',
        value: unknown
    ) => {
        // FormInput（AutocompleteInput）は選択値そのものを渡すが、
        // 念のため文字列以外が来た場合は表示用の値に正規化する
        const next = typeof value === 'string' ? value : String(value ?? '');
        setDetails((prev) =>
            prev.map((detail) => (detail.id === id ? { ...detail, [field]: next } : detail))
        );
    };

    /** 更新処理（入力内容を画面に反映する。API 連携時にサーバ更新へ置き換える） */
    const handleUpdate = (values: any) => {
        const now = formatDateTime(new Date());

        setPallet({
            palletNo: pallet.palletNo,
            category: normalizeChoiceValue(values?.category) || pallet.category,
            storageLocation: normalizeChoiceValue(values?.storageLocation) || pallet.storageLocation,
            locationNo: normalizeChoiceValue(values?.locationNo) || pallet.locationNo,
            remark: values?.remark || '',
        });
        // 明細の最終更新もあわせて更新する
        setDetails((prev) =>
            prev.map((detail) => ({ ...detail, updatedAt: now, updatedBy: loginUser }))
        );
        setUpdated({ at: now, by: loginUser });
        setFormKey((key) => key + 1);
        notify('パレット情報を更新しました。', { type: 'success' });
    };

    /** 削除処理（パレット情報を削除して一覧へ戻る） */
    const handleDelete = () => {
        if (!window.confirm('このパレット情報を削除してもよろしいですか？')) return;
        notify('パレット情報を削除しました。', { type: 'success' });
        navigate('/SP304');
    };

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー（右：番号表印刷） */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>パレット情報詳細</label>
                <Typography sx={spSx.actionLink} component="span" onClick={handlePrint}>
                    番号表印刷
                </Typography>
            </Box>

            {/* 基本情報（見出しもカード内に置き、項目はすべて入力枠にする） */}
            <Box sx={spSx.card}>
                <SimpleForm
                    key={formKey}
                    id="sp305-form"
                    sx={{ width: '100%', padding: '0' }}
                    onSubmit={handleUpdate}
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
                            {/* 入力項目は FormInput を使うため、カードごとにフォームを持つ */}
                            <SimpleForm
                                id={`sp305-item-${detail.id}`}
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
                                    {/* 数量：設計書どおり「－ 入力 ＋」の増減付き */}
                                    <div style={{ ...spSx.row, alignItems: 'center' }}>
                                        <span style={spSx.rowLabelFixed}>数量</span>
                                        <SpQuantityInput
                                            value={detail.quantity}
                                            onChange={(value) =>
                                                handleQuantityChange(detail.id, value)
                                            }
                                        />
                                    </div>
                                    {/* 保管区分・使用可否：FormInput のプルダウン */}
                                    <FormInput
                                        type={'select'}
                                        source="storageCategory"
                                        label="保管区分"
                                        choices={STORAGE_CATEGORY_CHOICES}
                                        structure="left-right"
                                        sx={spItemFieldSx}
                                        onChange={(value) =>
                                            handleDetailSelect(detail.id, 'storageCategory', value)
                                        }
                                    />
                                    <FormInput
                                        type={'select'}
                                        source="usableFlag"
                                        label="使用可否"
                                        choices={USABLE_CHOICES}
                                        structure="left-right"
                                        sx={spItemFieldSx}
                                        onChange={(value) =>
                                            handleDetailSelect(detail.id, 'usableFlag', value)
                                        }
                                    />
                                </div>
                            </SimpleForm>
                        </div>
                    ))
                )}
            </Box>

            {/* 登録・更新の実行者（明細一覧の下に置く。画面には固定しない） */}
            <Box sx={spSx.footer}>
                <div style={spSx.footerRow}>
                    <span style={spSx.footerLabel}>登録</span>
                    <span style={spSx.footerValue}>{registered.at}</span>
                    <span style={{ ...spSx.footerValue, marginLeft: 'auto' }}>{registered.by}</span>
                </div>
                <div style={spSx.footerRow}>
                    <span style={spSx.footerLabel}>更新</span>
                    <span style={spSx.footerValue}>{updated.at}</span>
                    <span style={{ ...spSx.footerValue, marginLeft: 'auto' }}>{updated.by}</span>
                </div>
            </Box>

            {/* 操作ボタン（設計書どおり 左：削除、右：更新） */}
            <Box sx={{ ...spSx.buttonBar, justifyContent: 'space-between' }}>
                <button style={spSx.secondaryButton} type="button" onClick={handleDelete}>
                    削除
                </button>
                <button style={spSx.primaryButton} type="submit" form="sp305-form">
                    更新
                </button>
            </Box>
        </Box>
    );
};

export default SP305;
