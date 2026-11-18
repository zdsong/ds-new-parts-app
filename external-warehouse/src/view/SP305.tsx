import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpQuantityInput from '../compontent/SpQuantityInput';
import useApiRequest from '../adapters/apiUtil';
import { spFormInputSx, spItemFieldSx, spSx } from '../styles/spSx';
import {
    CATEGORY_CHOICES,
    fromApiPallet,
    normalizeChoiceValue,
    printPalletLabels,
    toApiDetail,
} from '../utils/palletData';
import type {
    ApiPallet,
    OptionItem,
    PalletDetailItem,
    PalletFormData,
} from '../utils/palletData';

/**
 * パレット情報詳細画面（SP305）
 *
 * 設計書：①パレット番号管理 2.3／3.3 発番後（パレット情報詳細）
 *   発番済みパレットの内容を確認・修正し、パレット番号表を印刷する。
 *   パレット番号発番（SP303）／パレット番号一覧（SP304）からパレット番号を受け取り、
 *   GET /api/pallet/{palletNo} で内容を取得する。
 *   更新は PUT /api/pallet（version による楽観ロック）、削除は DELETE /api/pallet/{palletNo}。
 *   番号表印刷は、未印刷なら印刷の前に自動で更新（PUT /api/pallet）を行い、成功時のみ印刷し、
 *   印刷後は印刷済み（PUT /api/pallet/{palletNo}/printed）にする。
 *   印刷済み（printed_flg=1）の場合は、印刷以外の操作（更新・削除・明細の増減など）をできないようにする。
 */
interface Sp305State {
    /** 表示するパレット番号 */
    palletNo?: string;
    /** 品目検索（SP302）から戻った場合の編集途中の積載明細 */
    details?: PalletDetailItem[];
    /** 品目検索（SP302）から戻った場合の編集途中の基本情報 */
    pallet?: PalletFormData;
}

/** カード内の縦積みレイアウト（SP302／SP303 と同じ並びに揃える） */
const formColumn: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    minWidth: 0,
};

/** パレット番号が指定されていない場合の初期値 */
const EMPTY_PALLET: PalletFormData = {
    palletNo: '',
    category: '',
    storageLocation: '',
    locationNo: '',
    remark: '',
};

const SP305: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const notify = useNotify();
    const { request } = useApiRequest();

    const state = (location.state || {}) as Sp305State;
    // 表示するパレット番号（遷移元から受け取る）
    const palletNo = state.palletNo || state.pallet?.palletNo || '';

    // 基本情報
    const [pallet, setPallet] = useState<PalletFormData>(state.pallet || EMPTY_PALLET);
    // 積載明細（数量・保管区分・使用可否を編集できる）
    const [details, setDetails] = useState<PalletDetailItem[]>(state.details || []);
    // フォームを初期値で再描画するための世代番号
    const [formKey, setFormKey] = useState(0);
    // 楽観ロック用のバージョン
    const [version, setVersion] = useState<number | null>(null);
    // 更新処理中フラグ（更新ボタン・番号表印刷の二重起動を防止する）
    const [printing, setPrinting] = useState(false);
    // 印刷済みフラグ（printed_flg=1 の場合は印刷以外の操作をできないようにする）
    const [printed, setPrinted] = useState(false);
    // SP 画面で編集しない項目（PC 画面で登録された値を保持したまま更新する）
    const [storagePeriod, setStoragePeriod] = useState('');
    const [inboundDate, setInboundDate] = useState('');

    // 登録・更新の実行者と日時（画面下部に表示する）
    const [registered, setRegistered] = useState({ at: '', by: '' });
    const [updated, setUpdated] = useState({ at: '', by: '' });

    // 保管倉庫・ロケ番・辞書の選択肢
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [locationOptions, setLocationOptions] = useState<OptionItem[]>([]);
    const [storageTypeOptions, setStorageTypeOptions] = useState<OptionItem[]>([]);
    const [usableFlagOptions, setUsableFlagOptions] = useState<OptionItem[]>([]);

    /** 選択肢（倉庫・辞書）を取得する */
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [warehouse, storageType, usableFlag] = await Promise.all([
                    request('get', 'api/common/wh/options', {}, {}, false, false),
                    request('post', 'api/common/options', { cmdOptionName: 'bss_pallet_storage_type' }, {}, false, false),
                    request('post', 'api/common/options', { cmdOptionName: 'sys_usable_flag' }, {}, false, false),
                ]);
                setWarehouseOptions(warehouse?.data || []);
                setStorageTypeOptions(storageType?.data || []);
                setUsableFlagOptions(usableFlag?.data || []);
            } catch (error) {
                console.error(error);
            }
        };
        fetchOptions();
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

    /**
     * API から取得したパレット情報を画面に反映する
     *
     * @param apiPallet パレット情報
     * @param keepDetails true の場合、画面で編集中の積載明細を保持する（品目検索から戻ったとき）
     */
    const applyApiPallet = (apiPallet: ApiPallet | null, keepDetails = false) => {
        if (!apiPallet) return;
        const converted = fromApiPallet(apiPallet);
        setPallet(converted.form);
        setVersion(apiPallet.version ?? null);
        // 印刷済みの場合は印刷以外の操作をできなくする
        setPrinted(apiPallet.printedFlg === '1');
        setStoragePeriod(apiPallet.storagePeriod || '');
        setInboundDate(apiPallet.inboundDate || '');
        if (!keepDetails) {
            setDetails(converted.details);
        }
        setRegistered({
            at: apiPallet.createTime || '',
            by: apiPallet.createBy || '',
        });
        setUpdated({
            at: apiPallet.updateTime || '',
            by: apiPallet.updateBy || '',
        });
        setFormKey((key) => key + 1);
    };

    /** パレット情報を取得する */
    useEffect(() => {
        if (!palletNo) {
            notify('パレット番号が指定されていません。パレット番号一覧から選択してください。', {
                type: 'warning',
            });
            return;
        }
        const fetchPallet = async () => {
            try {
                const result = await request(
                    'get',
                    `api/pallet/${palletNo}`,
                    {},
                    {},
                    false,
                    false
                );
                const apiPallet: ApiPallet | null = result?.data || null;
                if (!apiPallet) {
                    notify('パレット情報を取得できませんでした。', { type: 'error' });
                    return;
                }
                // 品目検索から戻った場合は編集途中の明細を優先する
                applyApiPallet(apiPallet, (state.details?.length ?? 0) > 0);
            } catch (error) {
                console.error(error);
            }
        };
        fetchPallet();
    }, [palletNo]);

    /** 倉庫コードから倉庫名を取得する */
    const getWarehouseName = (whCd: string) =>
        warehouseOptions.find((option) => option.key === whCd)?.value || '';

    /** 保管倉庫の変更を画面の状態に反映する（ロケ番は選び直す） */
    const handleWarehouseChange = (value: unknown) => {
        if (printed) return;
        const next = normalizeChoiceValue(value);
        if (next === pallet.storageLocation) return;
        setPallet((prev) => ({ ...prev, storageLocation: next, locationNo: '' }));
        setFormKey((key) => key + 1);
    };

    /** 品目検索（SP302）へ進んで品目を追加する */
    const handleAddItem = () => {
        if (printed) return;
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
        if (printed) return;
        setDetails((prev) => prev.filter((detail) => detail.id !== id));
    };

    /** 数量を更新する（± の増減・直接入力のどちらもここに集約する） */
    const handleQuantityChange = (id: string, value: number) => {
        if (printed) return;
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
        if (printed) return;
        const next = typeof value === 'string' ? value : String(value ?? '');
        setDetails((prev) =>
            prev.map((detail) => (detail.id === id ? { ...detail, [field]: next } : detail))
        );
    };

    /**
     * 更新処理の本体（更新ボタン・番号表印刷の両方から呼ぶ）
     *
     * @param values フォームの値（省略時は画面の状態を使う）
     * @param options.silent true の場合、更新成功の通知を出さない（印刷時の二重通知を避ける）
     */
    const submitPallet = async (values?: any, options?: { silent?: boolean }): Promise<ApiPallet | null> => {
        if (!palletNo) {
            notify('パレット番号が指定されていません。', { type: 'warning' });
            return null;
        }
        if (printed) {
            notify('パレット番号表を印刷済みのため、変更できません。', { type: 'warning' });
            return null;
        }
        if (version === null) {
            notify('パレット情報を取得できていないため更新できません。', { type: 'error' });
            return null;
        }

        const classification = normalizeChoiceValue(values?.category) || pallet.category;
        const whCd = normalizeChoiceValue(values?.storageLocation) || pallet.storageLocation;
        const locCd = normalizeChoiceValue(values?.locationNo) || pallet.locationNo;

        if (!classification) {
            notify('区分は必須選択項目です。', { type: 'warning' });
            return null;
        }
        if (!whCd) {
            notify('保管倉庫は必須入力項目です。', { type: 'warning' });
            return null;
        }
        if (!locCd) {
            notify('保管エリア（ロケ番）は必須入力項目です。', { type: 'warning' });
            return null;
        }

        try {
            const result = await request(
                'put',
                'api/pallet',
                {
                    palletNo,
                    version,
                    classification,
                    whCd,
                    locCd,
                    storagePeriod,
                    inboundDate,
                    memo1: values?.remark || pallet.remark || '',
                    details: details.map(toApiDetail),
                },
                {},
                false,
                false
            );

            if (result?.code !== 200) {
                notify(result?.message || 'パレット情報の更新に失敗しました。', { type: 'error' });
                return null;
            }

            if (!options?.silent) {
                notify('パレット情報を更新しました。', { type: 'success' });
            }
            // 更新後のバージョン・日時を取得し直す
            const refreshed = await request('get', `api/pallet/${palletNo}`, {}, {}, false, false);
            const apiPallet: ApiPallet | null = refreshed?.data || null;
            applyApiPallet(apiPallet);
            return apiPallet;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    /** 更新処理（サーバのパレット情報を更新する） */
    const handleUpdate = async (values: any) => {
        await submitPallet(values);
    };

    /** パレット番号表を印刷済みにする（以降は印刷以外の操作ができなくなる） */
    const markPrinted = async () => {
        const result = await request('put', `api/pallet/${palletNo}/printed`, {}, {}, false, false);
        if (result?.code !== 200) {
            notify(result?.message || '印刷フラグの更新に失敗しました。', { type: 'error' });
            return;
        }
        // 印刷済みになった状態（バージョン・更新日時）を取得し直す
        const refreshed = await request('get', `api/pallet/${palletNo}`, {}, {}, false, false);
        applyApiPallet(refreshed?.data || null);
    };

    /** 印刷後の保存（更新 → 印刷済みにする） */
    const saveAfterPrint = async () => {
        setPrinting(true);
        try {
            const apiPallet = await submitPallet(undefined, { silent: true });
            if (!apiPallet) {
                notify('印刷は行いましたが、パレット情報の更新に失敗しました。', { type: 'error' });
                return;
            }
            await markPrinted();
        } catch (error) {
            console.error(error);
            notify('印刷後の更新に失敗しました。', { type: 'error' });
        } finally {
            setPrinting(false);
        }
    };

    /**
     * 番号表を印刷する
     *
     * 印刷ダイアログは「クリックと同じ処理の流れ」で開く必要があるため、
     * 更新などの非同期処理を待たずに、画面の内容をそのまま印刷する
     * （待つと端末によってはダイアログが開かず、何も起きていないように見える）。
     * 未印刷の場合は、印刷のあとに更新と印刷済みの更新を行う。
     * 印刷できた場合は印刷済み（printed_flg=1）にし、以降は印刷以外の操作をできなくする。
     * 印刷済みの場合はデータを変更できないため、そのまま印刷する。
     */
    const handlePrint = () => {
        if (printing) return;
        if (!palletNo) {
            notify('パレット番号が指定されていません。パレット番号一覧から選択してください。', {
                type: 'warning',
            });
            return;
        }
        if (version === null) {
            notify('パレット情報を取得できていないため印刷できません。', { type: 'error' });
            return;
        }

        const count = printPalletLabels(
            [
                {
                    ...pallet,
                    storageLocationName: getWarehouseName(pallet.storageLocation),
                    details,
                },
            ],
            undefined,
            () => {
                notify(
                    'この端末では印刷画面を開けませんでした。ブラウザ（Safari / Chrome）で開いてください。',
                    { type: 'warning' }
                );
            }
        );
        if (count === 0) {
            notify('印刷を開始できませんでした。ブラウザの印刷機能をご確認ください。', {
                type: 'warning',
            });
            return;
        }
        notify(`${count} 枚のパレット番号表を印刷します。`, { type: 'success' });

        // 印刷のあとに保存する（印刷ダイアログを開く前に待つと、端末によっては開かなくなるため）
        if (!printed) {
            void saveAfterPrint();
        }
    };

    /** 削除処理（パレット情報を削除して一覧へ戻る） */
    const handleDelete = async () => {
        if (!palletNo) {
            notify('パレット番号が指定されていません。', { type: 'warning' });
            return;
        }
        if (printed) {
            notify('パレット番号表を印刷済みのため、削除できません。', { type: 'warning' });
            return;
        }
        if (!window.confirm('このパレット情報を削除してもよろしいですか？')) return;

        try {
            const result = await request('delete', `api/pallet/${palletNo}`, {}, {}, false, false);
            if (result?.code !== 200) {
                notify(result?.message || 'パレット情報の削除に失敗しました。', { type: 'error' });
                return;
            }
            notify('パレット情報を削除しました。', { type: 'success' });
            navigate('/SP304');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー（画面名のみ） */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>パレット情報詳細</label>
            </Box>

            {/* タイトル直下の操作行（番号表印刷。印刷の前に自動で更新する） */}
            <Box sx={spSx.titleActionBar}>
                <Box
                    component="button"
                    type="button"
                    sx={spSx.actionButton}
                    disabled={printing}
                    onClick={handlePrint}
                >
                    {printing ? '印刷中…' : '番号表印刷'}
                </Box>
            </Box>

            {/* 印刷済みの場合は変更できないことを明示する */}
            {printed && (
                <div style={spSx.printedNotice}>
                    番号表を印刷済みのため、印刷以外の操作はできません。
                </div>
            )}

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
                            disabled={printed}
                            onChange={(value) =>
                                setPallet((prev) => ({
                                    ...prev,
                                    category: normalizeChoiceValue(value),
                                }))
                            }
                        />
                        <FormInput
                            type={'filter-select'}
                            source="storageLocation"
                            label="保管倉庫"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={warehouseOptions}
                            disabled={printed}
                            onChange={handleWarehouseChange}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="locationNo"
                            label="保管エリア（ロケ番）"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={locationOptions}
                            disabled={printed}
                            onChange={(value) =>
                                setPallet((prev) => ({
                                    ...prev,
                                    locationNo: normalizeChoiceValue(value),
                                }))
                            }
                        />
                        <FormInput
                            type={'text'}
                            source="remark"
                            label="備考"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            multiline
                            inputHeight={80}
                            disabled={printed}
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
                <span
                    style={printed ? spSx.linkDisabled : spSx.link}
                    onClick={printed ? undefined : handleAddItem}
                >
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
                                            style={printed ? spSx.linkDisabled : spSx.linkDanger}
                                            onClick={printed ? undefined : () => handleRemove(detail.id)}
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
                                            disabled={printed}
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
                                        choices={storageTypeOptions}
                                        disabled={printed}
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
                                        choices={usableFlagOptions}
                                        disabled={printed}
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
                    <span style={spSx.footerValue}>{registered.at || '－'}</span>
                    <span style={{ ...spSx.footerValue, marginLeft: 'auto' }}>{registered.by || '－'}</span>
                </div>
                <div style={spSx.footerRow}>
                    <span style={spSx.footerLabel}>更新</span>
                    <span style={spSx.footerValue}>{updated.at || '－'}</span>
                    <span style={{ ...spSx.footerValue, marginLeft: 'auto' }}>{updated.by || '－'}</span>
                </div>
            </Box>

            {/* 操作ボタン（設計書どおり 左：削除、右：更新） */}
            <Box sx={{ ...spSx.buttonBar, justifyContent: 'space-between' }}>
                <button
                    style={printed ? { ...spSx.secondaryButton, ...spSx.buttonDisabled } : spSx.secondaryButton}
                    type="button"
                    onClick={handleDelete}
                    disabled={!palletNo || printed}
                >
                    削除
                </button>
                <button
                    style={printed ? { ...spSx.primaryButton, ...spSx.buttonDisabled } : spSx.primaryButton}
                    type="submit"
                    form="sp305-form"
                    disabled={printing || printed}
                >
                    更新
                </button>
            </Box>
        </Box>
    );
};

export default SP305;
