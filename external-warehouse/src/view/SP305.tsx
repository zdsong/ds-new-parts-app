import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpQuantityInput from '../compontent/SpQuantityInput';
import useApiRequest from '../adapters/apiUtil';
import { spFormInputSx, spSx } from '../styles/spSx';
import {
    CATEGORY_CHOICES,
    fromApiPallet,
    hasNonPositiveQuantity,
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
 *   番号表印刷は、クリックと同じ処理の流れで印刷ダイアログを開く。
 *   ダイアログを閉じたあと、未印刷なら更新（PUT /api/pallet）と印刷済み
 *   （PUT /api/pallet/{palletNo}/printed）を行う。
 *   ダイアログ表示中に画面を描き換えると、端末によってはダイアログが閉じ、直接印刷される。
 *   未印刷の印刷では、サーバが在庫情報詳細と在庫履歴を登録する。印刷済みの再印刷では在庫を登録しない。
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

/** 文字リンクと同じ見た目のボタン（Chrome / Safari の既定ボタン枠を出さない） */
const textButton: React.CSSProperties = {
    border: 'none',
    background: 'none',
    padding: 0,
    font: 'inherit',
};

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
    // 更新ボタンはフォームの submit から呼ばれるため、描画時点の明細ではなく最新の明細を送る
    const detailsRef = useRef<PalletDetailItem[]>(details);
    detailsRef.current = details;
    // 利用者が明細を編集したあとに、取得中の応答で明細を戻さない
    const detailsEditedRef = useRef(false);
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
            notify('notify.pallet.number_not_specified_from_list', {
                type: 'warning',
            });
            return;
        }
        let cancelled = false;
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
                if (cancelled) return;
                const apiPallet: ApiPallet | null = result?.data || null;
                if (!apiPallet) {
                    notify('notify.pallet.fetch_failed', { type: 'error' });
                    return;
                }
                // 品目検索から戻った明細、または画面で削除・変更した明細をサーバの古い応答で上書きしない
                applyApiPallet(
                    apiPallet,
                    (state.details?.length ?? 0) > 0 || detailsEditedRef.current
                );
            } catch (error) {
                console.error(error);
            }
        };
        fetchPallet();
        return () => {
            cancelled = true;
        };
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

    /** 積載明細を画面から外す。更新時にこの結果を保存する */
    const handleRemove = (id: string) => {
        if (printed) return;
        detailsEditedRef.current = true;
        setDetails((prev) => {
            const next = prev.filter((detail) => detail.id !== id);
            detailsRef.current = next;
            return next;
        });
    };

    /** 数量を更新する（± の増減・直接入力のどちらもここに集約する） */
    const handleQuantityChange = (id: string, value: number) => {
        if (printed) return;
        detailsEditedRef.current = true;
        setDetails((prev) => {
            const next = prev.map((detail) =>
                detail.id === id ? { ...detail, quantity: value } : detail
            );
            detailsRef.current = next;
            return next;
        });
    };

    /** 保管区分・使用可否を更新する */
    const handleDetailSelect = (
        id: string,
        field: 'storageCategory' | 'usableFlag',
        value: unknown
    ) => {
        if (printed) return;
        detailsEditedRef.current = true;
        const next = typeof value === 'string' ? value : String(value ?? '');
        setDetails((prev) => {
            const nextDetails = prev.map((detail) =>
                detail.id === id ? { ...detail, [field]: next } : detail
            );
            detailsRef.current = nextDetails;
            return nextDetails;
        });
    };

    /**
     * 更新処理の本体（更新ボタン・番号表印刷の両方から呼ぶ）
     *
     * @param values フォームの値（省略時は画面の状態を使う）
     * @param options.silent true の場合、更新成功の通知を出さない（印刷時の二重通知を避ける）
     */
    const submitPallet = async (values?: any, options?: { silent?: boolean }): Promise<ApiPallet | null> => {
        if (!palletNo) {
            notify('notify.pallet.number_not_specified', { type: 'warning' });
            return null;
        }
        if (printed) {
            notify('notify.pallet.printed_cannot_change', { type: 'warning' });
            return null;
        }
        if (version === null) {
            notify('notify.pallet.not_loaded_cannot_update', { type: 'error' });
            return null;
        }

        const classification = normalizeChoiceValue(values?.category) || pallet.category;
        const whCd = normalizeChoiceValue(values?.storageLocation) || pallet.storageLocation;
        const locCd = normalizeChoiceValue(values?.locationNo) || pallet.locationNo;

        if (!classification) {
            notify('notify.pallet.category_required', { type: 'warning' });
            return null;
        }
        if (!whCd) {
            notify('notify.pallet.warehouse_required', { type: 'warning' });
            return null;
        }
        if (!locCd) {
            notify('notify.pallet.location_required', { type: 'warning' });
            return null;
        }
        // 削除した明細を含めず、いま画面にある明細だけを保存する
        const currentDetails = detailsRef.current;
        if (hasNonPositiveQuantity(currentDetails)) {
            notify('notify.pallet.quantity_must_be_positive', { type: 'warning' });
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
                    details: currentDetails.map(toApiDetail),
                },
                {},
                false,
                false
            );

            if (result?.code !== 200) {
                notify(result?.message || 'notify.pallet.update_failed', { type: 'error' });
                return null;
            }

            if (!options?.silent) {
                notify('notify.pallet.updated', { type: 'success' });
            }
            // 更新後のバージョン・日時を取得し直す
            const refreshed = await request('get', `api/pallet/${palletNo}`, {}, {}, false, false);
            const apiPallet: ApiPallet | null = refreshed?.data || null;
            detailsEditedRef.current = false;
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

    /** パレット番号表を印刷済みにする（在庫を登録し、以降は印刷以外の操作ができなくなる） */
    const markPrinted = async (): Promise<boolean> => {
        const result = await request('put', `api/pallet/${palletNo}/printed`, {}, {}, false, false);
        if (result?.code !== 200) {
            notify(result?.message || 'notify.pallet.print_flag_failed', { type: 'error' });
            return false;
        }
        // 印刷済みになった状態（バージョン・更新日時）を取得し直す
        const refreshed = await request('get', `api/pallet/${palletNo}`, {}, {}, false, false);
        applyApiPallet(refreshed?.data || null);
        return true;
    };

    /**
     * 番号表を印刷する
     *
     * 印刷の前に、パレット情報の更新 → 在庫の登録・印刷済みへの更新を行う。
     * 保存に失敗した場合は印刷しない（印刷済みにしてから更新できなくなるのを防ぐ）。
     * 印刷済みの場合はデータを変更できないため、そのまま印刷する。
     */
    const handlePrint = async () => {
        if (printing) return;
        if (!palletNo) {
            notify('notify.pallet.number_not_specified_from_list', {
                type: 'warning',
            });
            return;
        }
        if (version === null) {
            notify('notify.pallet.not_loaded_cannot_print', { type: 'error' });
            return;
        }
        // 未印刷の印刷は保存を伴うため、数量が 0 以下のときは印刷も保存もしない
        if (!printed && hasNonPositiveQuantity(detailsRef.current)) {
            notify('notify.pallet.quantity_must_be_positive', { type: 'warning' });
            return;
        }

        if (!printed) {
            setPrinting(true);
            try {
                // 先にパレット情報を保存する（印刷済みにすると更新できなくなるため）
                const apiPallet = await submitPallet(undefined, { silent: true });
                if (!apiPallet) {
                    notify('notify.pallet.save_before_print_failed', { type: 'error' });
                    return;
                }
                // 在庫を登録してから印刷済みにする
                if (!(await markPrinted())) {
                    notify('notify.pallet.stock_before_print_failed', { type: 'error' });
                    return;
                }
            } catch (error) {
                console.error(error);
                notify('notify.pallet.save_before_print_generic_failed', { type: 'error' });
                return;
            } finally {
                setPrinting(false);
            }
        }

        const count = printPalletLabels([
            {
                ...pallet,
                storageLocationName: getWarehouseName(pallet.storageLocation),
                details: detailsRef.current,
            },
        ]);
        if (count === 0) {
            notify('notify.pallet.print_start_failed', {
                type: 'warning',
            });
            return;
        }
        notify('notify.pallet.print_one_sheet', { type: 'success' });
    };

    /** 削除処理（パレット情報を削除して一覧へ戻る） */
    const handleDelete = async () => {
        if (!palletNo) {
            notify('notify.pallet.number_not_specified', { type: 'warning' });
            return;
        }
        if (printed) {
            notify('notify.pallet.printed_cannot_delete', { type: 'warning' });
            return;
        }
        if (!window.confirm('このパレット情報を削除してもよろしいですか？')) return;

        try {
            const result = await request('delete', `api/pallet/${palletNo}`, {}, {}, false, false);
            if (result?.code !== 200) {
                notify(result?.message || 'notify.pallet.delete_failed', { type: 'error' });
                return;
            }
            notify('notify.pallet.deleted', { type: 'success' });
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
                    sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
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
                                sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                                onSubmit={() => {}}
                                toolbar={false}
                                defaultValues={detail}
                            >
                                <div style={{ ...formColumn, gap: '6px' }}>
                                    <div style={spSx.itemHeader}>
                                        <span style={spSx.itemTitle}>{`No.${index + 1}`}</span>
                                        <button
                                            type="button"
                                            style={{
                                                ...textButton,
                                                ...(printed ? spSx.linkDisabled : spSx.linkDanger),
                                            }}
                                            disabled={printed}
                                            onClick={() => handleRemove(detail.id)}
                                        >
                                            削除
                                        </button>
                                    </div>
                                    <div style={spSx.field}>
                                        <span style={spSx.fieldLabel}>品目コード</span>
                                        <span style={spSx.fieldValue}>{detail.itemCode}</span>
                                    </div>
                                    <div style={spSx.field}>
                                        <span style={spSx.fieldLabel}>品目名</span>
                                        <span style={spSx.fieldValue}>{detail.itemName}</span>
                                    </div>
                                    {/* 数量：ラベルを上、「－ 入力 ＋」を下に置く */}
                                    <div style={spSx.field}>
                                        <span style={spSx.fieldLabel}>数量</span>
                                        <SpQuantityInput
                                            disabled={printed}
                                            value={detail.quantity}
                                            onChange={(value) =>
                                                handleQuantityChange(detail.id, value)
                                            }
                                        />
                                    </div>
                                    {/* 保管区分・使用可否：基本情報と同じ上下配置 */}
                                    <FormInput
                                        type={'select'}
                                        source="storageCategory"
                                        label="保管区分"
                                        choices={storageTypeOptions}
                                        disabled={printed}
                                        structure="top-bottom"
                                        sx={spFormInputSx}
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
                                        structure="top-bottom"
                                        sx={spFormInputSx}
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
