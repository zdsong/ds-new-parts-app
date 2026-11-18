import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpQuantityInput from '../compontent/SpQuantityInput';
import useApiRequest from '../adapters/apiUtil';
import { spFormInputSx, spSx } from '../styles/spSx';
import {
    CATEGORY_CHOICES,
    normalizeChoiceValue,
    printPalletLabels,
    toApiDetail,
} from '../utils/palletData';
import type { OptionItem, PalletDetailItem, PalletFormData } from '../utils/palletData';

/**
 * パレット番号発番画面（SP303）
 *
 * 設計書：①パレット番号管理 3.3 パレット番号発番
 *   品目検索（SP302）で追加した品目と、保管倉庫・ロケ番・備考を確認して発番する。
 *   発番は POST /api/pallet でサーバ側の採番結果を受け取り、
 *   パレット情報詳細（SP305）へパレット番号を引き継いで遷移する。
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
    const { request } = useApiRequest();

    const state = (location.state || {}) as Sp303State;

    // 基本情報の初期値
    const [pallet, setPallet] = useState<PalletFormData>({
        palletNo: state.pallet?.palletNo || '',
        category: state.pallet?.category || state.category || '1',
        storageLocation: state.pallet?.storageLocation || '',
        locationNo: state.pallet?.locationNo || '',
        remark: state.pallet?.remark || '',
    });
    // 積載明細
    const [details, setDetails] = useState<PalletDetailItem[]>(state.details || []);
    // フォーム再描画用の世代番号
    const [formKey, setFormKey] = useState(0);

    // 保管倉庫・ロケ番の選択肢
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [locationOptions, setLocationOptions] = useState<OptionItem[]>([]);

    /** 保管倉庫の選択肢を取得する */
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const result = await request('get', 'api/common/wh/options', {}, {}, false, false);
                const options: OptionItem[] = result?.data || [];
                setWarehouseOptions(options);
                // 未選択の場合は先頭の倉庫を初期値にする
                setPallet((prev) =>
                    prev.storageLocation || options.length === 0
                        ? prev
                        : { ...prev, storageLocation: options[0].key }
                );
                setFormKey((key) => key + 1);
            } catch (error) {
                console.error(error);
            }
        };
        fetchWarehouses();
    }, []);

    /** 保管倉庫に紐づくロケ番の選択肢を取得する */
    useEffect(() => {
        const fetchLocations = async () => {
            if (!pallet.storageLocation) {
                setLocationOptions([]);
                return;
            }
            try {
                const result = await request(
                    'get',
                    `api/common/${pallet.storageLocation}/location/options`,
                    {},
                    {},
                    false,
                    false
                );
                setLocationOptions(result?.data || []);
            } catch (error) {
                console.error(error);
            }
        };
        fetchLocations();
    }, [pallet.storageLocation]);

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

    /** 保管倉庫・ロケ番の変更を画面の状態に反映する */
    const handleSelectChange = (field: 'storageLocation' | 'locationNo', value: unknown) => {
        const next = normalizeChoiceValue(value);
        if (field === 'storageLocation') {
            // 倉庫が変わったらロケ番は選び直す（フォームも初期値で作り直す）
            setPallet((prev) => ({ ...prev, storageLocation: next, locationNo: '' }));
            setFormKey((key) => key + 1);
            return;
        }
        setPallet((prev) => ({ ...prev, locationNo: next }));
    };

    /** 区分の変更を画面の状態に反映する（品目追加時の区分に使用する） */
    const handleCategoryChange = (value: unknown) => {
        setPallet((prev) => ({ ...prev, category: normalizeChoiceValue(value) }));
    };

    /** 発番する（サーバ側で採番してパレット情報を登録する） */
    const handleIssue = async (values: any) => {
        if (details.length === 0) {
            notify('積載する品目を追加してください。', { type: 'warning' });
            return;
        }

        const classification = normalizeChoiceValue(values?.category) || pallet.category;
        const whCd = normalizeChoiceValue(values?.storageLocation) || pallet.storageLocation;
        const locCd = normalizeChoiceValue(values?.locationNo) || pallet.locationNo;

        if (!classification) {
            notify('区分は必須選択項目です。', { type: 'warning' });
            return;
        }
        if (!whCd) {
            notify('保管倉庫は必須入力項目です。', { type: 'warning' });
            return;
        }
        if (!locCd) {
            notify('保管エリア（ロケ番）は必須入力項目です。', { type: 'warning' });
            return;
        }

        try {
            const result = await request(
                'post',
                'api/pallet',
                {
                    classification,
                    whCd,
                    locCd,
                    storagePeriod: '',
                    memo1: values?.remark || '',
                    details: details.map(toApiDetail),
                },
                {},
                false,
                false
            );

            if (result?.code !== 200) {
                notify(result?.message || 'パレット番号の発番に失敗しました。', { type: 'error' });
                return;
            }

            const palletNo = result?.palletNo || result?.data || '';
            notify(`パレット番号 ${palletNo} を発番しました。`, { type: 'success' });
            // 発番後はパレット情報詳細へ遷移する（詳細はサーバから取得する）
            navigate('/SP305', { state: { palletNo } });
        } catch (error) {
            console.error(error);
        }
    };

    /** 番号表を印刷する（発番済みの場合のみ。パレット 1 件につき 1 枚） */
    const handlePrint = () => {
        if (!pallet.palletNo) {
            notify('発番後に番号表を印刷できます。', { type: 'warning' });
            return;
        }
        const count = printPalletLabels([
            {
                palletNo: pallet.palletNo,
                category: pallet.category,
                storageLocation: pallet.storageLocation,
                // 備考１には保管倉庫の名称を印字する
                storageLocationName:
                    warehouseOptions.find((option) => option.key === pallet.storageLocation)?.value ?? '',
                details,
            },
        ]);
        if (count === 0) {
            notify('印刷用ウィンドウを開けませんでした。ポップアップブロックを解除してください。', {
                type: 'warning',
            });
        }
    };

    /** 入力内容と積載明細を初期化する */
    const handleReset = () => {
        setPallet({
            palletNo: '',
            category: '1',
            storageLocation: warehouseOptions.length > 0 ? warehouseOptions[0].key : '',
            locationNo: '',
            remark: '',
        });
        setDetails([]);
        setFormKey((key) => key + 1);
    };

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー（画面名のみ） */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>パレット番号発番</label>
            </Box>

            {/* タイトル直下の操作行（番号表印刷） */}
            <Box sx={spSx.titleActionBar}>
                <Box
                    component="button"
                    type="button"
                    sx={pallet.palletNo ? spSx.actionButton : spSx.actionButtonDisabled}
                    onClick={handlePrint}
                >
                    番号表印刷
                </Box>
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
                            onChange={handleCategoryChange}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="storageLocation"
                            label="保管倉庫"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={warehouseOptions}
                            onChange={(value) => handleSelectChange('storageLocation', value)}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="locationNo"
                            label="保管エリア（ロケ番）"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={locationOptions}
                            onChange={(value) => handleSelectChange('locationNo', value)}
                        />
                        <FormInput
                            type={'text'}
                            source="remark"
                            label="備考"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            multiline
                            inputHeight={80}
                            placeholder="入力してください"
                            onChange={(value) =>
                                setPallet((prev) => ({ ...prev, remark: value ?? '' }))
                            }
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
                <button style={spSx.secondaryButton} type="button" onClick={handleReset}>
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
