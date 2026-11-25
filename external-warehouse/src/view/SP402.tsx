import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import useApiRequest from '../adapters/apiUtil';
import FormInput from '../compontent/FormInput';
import type { FormInputRefHandle } from '../compontent/FormInput';
import SpQuantityInput from '../compontent/SpQuantityInput';
import { spFormInputSx, spSx } from '../styles/spSx';
import {
    REGISTER_WITHOUT_DEPENDENCY,
    REGISTER_WITH_DEPENDENCY,
} from '../utils/moveData';
import type { MoveLine, MoveRegisterState } from '../utils/moveData';
import { normalizeChoiceValue } from '../utils/palletData';

/**
 * 移動登録画面（SP402）
 *
 * 設計書：③移動管理 1-3 移動登録。
 * 移動依頼は SP404、登録完了（1-4 パレット番号表印刷）は SP405。
 */

/** 倉庫・ロケ番の選択肢 */
interface OptionItem {
    key: string;
    value: string;
}

/** カード内の縦積み。検索欄と同じ幅にする */
const formColumn: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    minWidth: 0,
};

/** カード内の項目（項目名＋値の縦積み） */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={spSx.field}>
        <span style={spSx.fieldLabel}>{label}</span>
        <span style={spSx.fieldValue}>{children}</span>
    </div>
);

/**
 * 移動登録（設計書 ③移動管理 1-3）
 * 画面表示は依存の有無にかかわらず同じ並びにし、移動依頼がある品目だけ
 * 移動依頼詳細を出す（依存がない場合は依頼部分を表示しない）。
 */
const MoveRegister: React.FC<{ initial: MoveRegisterState }> = ({ initial }) => {
    const navigate = useNavigate();
    const notify = useNotify();
    const { request } = useApiRequest();
    const dependent = initial.dependent;
    const readOnlyQty = Boolean(initial.readOnlyQty);
    const [lines, setLines] = useState<MoveLine[]>(initial.lines.map((line) => ({ ...line })));
    const [warehouse, setWarehouse] = useState('');
    const [location, setLocation] = useState('');
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [locationOptions, setLocationOptions] = useState<OptionItem[]>([]);
    const [remark, setRemark] = useState('');
    const [registrar, setRegistrar] = useState('');
    const [formKey, setFormKey] = useState(0);
    // 二重登録を防ぐため、送信中はボタンを押せなくする
    const [submitting, setSubmitting] = useState(false);
    // 未入力の項目へフォーカスを移すための参照
    const warehouseRef = useRef<FormInputRefHandle | null>(null);
    const locationRef = useRef<FormInputRefHandle | null>(null);
    const registrarRef = useRef<FormInputRefHandle | null>(null);
    const [openId, setOpenId] = useState<string | null>(
        dependent ? initial.lines.find((line) => line.request)?.id ?? null : null
    );

    /** 倉庫・ロケ番の選択肢を共通 API から取得する */
    useEffect(() => {
        const loadWarehouses = async () => {
            const result = await request('get', 'api/common/wh/options', {}, {}, false, false);
            const options = Array.isArray(result?.data) ? (result.data as OptionItem[]) : [];
            setWarehouseOptions(options);
            if (options.length > 0) {
                setWarehouse(options[0].key);
                setFormKey((key) => key + 1);
            }
        };
        loadWarehouses();
    }, [request]);

    /** 倉庫が変わったらロケ番の選択肢を取得する */
    useEffect(() => {
        const loadLocations = async () => {
            if (!warehouse) {
                setLocationOptions([]);
                return;
            }
            const result = await request(
                'get',
                `api/common/${warehouse}/location/options`,
                {},
                {},
                false,
                false
            );
            setLocationOptions(Array.isArray(result?.data) ? result.data : []);
        };
        loadLocations();
    }, [request, warehouse]);

    const handleWarehouse = (value: unknown) => {
        setWarehouse(normalizeChoiceValue(value));
        setLocation('');
        setFormKey((key) => key + 1);
    };

    const handleRemove = (id: string) => {
        setLines((prev) => prev.filter((line) => line.id !== id));
    };

    const handleSubmit = async () => {
        if (!warehouse) {
            notify('notify.transfer.select_dest_warehouse', { type: 'warning' });
            warehouseRef.current?.focus();
            return;
        }
        if (!location) {
            notify('notify.transfer.select_dest_location', { type: 'warning' });
            locationRef.current?.focus();
            return;
        }
        if (lines.length === 0) {
            notify('notify.transfer.add_move_items', { type: 'warning' });
            return;
        }
        if (lines.some((line) => line.moveQty <= 0)) {
            notify('notify.transfer.enter_move_qty', { type: 'warning' });
            return;
        }
        if (lines.some((line) => line.moveQty > line.storageQty)) {
            notify('notify.transfer.move_qty_over_storage', { type: 'warning' });
            return;
        }
        if (!registrar.trim()) {
            notify('notify.transfer.enter_registrar', { type: 'warning' });
            registrarRef.current?.focus();
            return;
        }
        if (submitting) {
            return;
        }
        setSubmitting(true);
        try {
            const response = await request('post', 'api/transfer/register', {
                palletNo: initial.palletNo || lines[0]?.palletNo || '',
                dependent,
                destinationWhCd: warehouse,
                destinationLocCd: location,
                remark,
                registrar: registrar.trim(),
                lines: lines.map((line) => ({
                    id: line.id,
                    itemCode: line.itemCode,
                    itemName: line.itemName,
                    category: line.category,
                    moveQty: line.moveQty,
                    storageQty: line.storageQty,
                    palletNo: line.palletNo,
                    version: line.version ?? null,
                    requestNo: line.request?.requestNo ?? null,
                    requestDetailNo: line.request?.requestDetailNo ?? null,
                })),
            });
            const data = response?.code === 200
                ? (response.data as { transferNo: string; palletNo: string; mode: 'whole' | 'issue' } | null)
                : null;
            if (!data) {
                return;
            }
            navigate('/SP405', {
                replace: true,
                state: {
                    view: 'complete',
                    mode: data.mode,
                    moveNo: data.transferNo,
                    palletNo: data.palletNo,
                    destinationWh: warehouse,
                    destinationWhNm:
                        warehouseOptions.find((option) => option.key === warehouse)?.value || warehouse,
                    destinationLoc: location,
                    remark,
                    registrar: registrar.trim(),
                    lines,
                },
            });
        } catch {
            // エラー内容は request 内で通知されるため、ここでは何もしない
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={spSx.page}>
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>移動登録</label>
            </Box>
            <Box sx={spSx.sectionTitle}>■基本情報</Box>
            <Box sx={spSx.card}>
                <SimpleForm
                    key={formKey}
                    toolbar={false}
                    sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                    onSubmit={() => undefined}
                    defaultValues={{
                        palletNo: initial.palletNo,
                        destinationWh: warehouse,
                        destinationLoc: location,
                        remark,
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <FormInput
                            type={'text'}
                            source="palletNo"
                            label="パレット番号"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="未発番"
                            disabled
                        />
                        <FormInput
                            ref={warehouseRef}
                            type={'filter-select'}
                            source="destinationWh"
                            label="移動先"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={warehouseOptions}
                            onChange={handleWarehouse}
                        />
                        <FormInput
                            ref={locationRef}
                            type={'filter-select'}
                            source="destinationLoc"
                            label="ロケ番"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={locationOptions}
                            onChange={(value) => setLocation(normalizeChoiceValue(value))}
                        />
                    </div>
                </SimpleForm>
            </Box>

            <Box sx={spSx.sectionTitle}>{`■追加品目（${lines.length}件）`}</Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lines.map((line) => (
                    <div key={line.id} style={spSx.listCard}>
                        <div style={spSx.itemHeader}>
                            <span style={spSx.itemTitle}>{line.itemCode}</span>
                            {readOnlyQty ? null : (
                                <span style={spSx.linkDanger} onClick={() => handleRemove(line.id)}>
                                    削除
                                </span>
                            )}
                        </div>
                        <Field label="品目名">{line.itemName}</Field>
                        <div style={spSx.field}>
                            <span style={spSx.fieldLabel}>移動数量/保管数量</span>
                            <SimpleForm
                                toolbar={false}
                                sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                                onSubmit={() => undefined}
                                defaultValues={{ quantity: line.moveQty }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <SpQuantityInput
                                        value={line.moveQty}
                                        min={1}
                                        disabled={readOnlyQty}
                                        onChange={(value) =>
                                            setLines((prev) =>
                                                prev.map((item) =>
                                                    item.id === line.id ? { ...item, moveQty: value } : item
                                                )
                                            )
                                        }
                                    />
                                    <span style={{ ...spSx.fieldValue, paddingLeft: 0 }}>{`/ ${line.storageQty}`}</span>
                                </div>
                            </SimpleForm>
                        </div>
                        <Field label="パレット番号">{line.palletNo}</Field>
                        <Field label="保管場所">{line.storagePlace}</Field>
                        {line.request ? (
                            <div style={spSx.subSection}>
                                <div
                                    style={spSx.subSectionHeader}
                                    onClick={() => setOpenId((current) => (current === line.id ? null : line.id))}
                                    role="button"
                                    aria-expanded={openId === line.id}
                                >
                                    <span>移動依頼詳細</span>
                                    <span>{openId === line.id ? '－' : '＋'}</span>
                                </div>
                                {openId === line.id ? (
                                    <div style={spSx.subItem}>
                                        <span style={spSx.subItemLabel}>移動依頼番号</span>
                                        <span style={spSx.subItemValue}>{line.request.requestNo}</span>
                                        <span style={spSx.subItemLabel}>移動先</span>
                                        <span style={spSx.subItemValue}>{line.request.destinationLabel}</span>
                                        <span style={spSx.subItemLabel}>依頼者</span>
                                        <span style={spSx.subItemValue}>{line.request.requester}</span>
                                        <span style={spSx.subItemLabel}>移動希望日</span>
                                        <span style={spSx.subItemValue}>{line.request.desiredDate}</span>
                                        <span style={spSx.subItemLabel}>備考</span>
                                        <span style={spSx.subItemValue}>{line.request.remark || '－'}</span>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ))}
            </Box>

            <Box sx={spSx.card}>
                <SimpleForm
                    toolbar={false}
                    sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                    onSubmit={() => undefined}
                    defaultValues={{ remark, registrar }}
                >
                    <div style={formColumn}>
                        <FormInput
                            type={'text'}
                            source="remark"
                            label="備考"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            multiline
                            inputHeight={80}
                            placeholder="入力してください"
                            onChange={(value) => setRemark(typeof value === 'string' ? value : '')}
                        />
                        <FormInput
                            ref={registrarRef}
                            type={'text'}
                            source="registrar"
                            label="移動登録者"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="入力してください"
                            onChange={(value) => setRegistrar(typeof value === 'string' ? value : '')}
                        />
                    </div>
                </SimpleForm>
            </Box>

            <Box sx={{ display: 'flex', gap: '12px' }}>
                <button type="button" style={spSx.secondaryButton} onClick={() => navigate(-1)}>
                    戻る
                </button>
                <button
                    type="button"
                    style={submitting ? { ...spSx.primaryButton, ...spSx.buttonDisabled } : spSx.primaryButton}
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    移動登録
                </button>
            </Box>
        </Box>
    );
};

/** 1-3 移動登録。確認用は ?sample=dependent / ?sample=plain */
const SP402: React.FC = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const sample = searchParams.get('sample');
    const state = (location.state || {}) as {
        view?: string;
        mode?: MoveRegisterState['mode'];
        dependent?: boolean;
        moveNo?: string;
        palletNo?: string;
        destinationWh?: string;
        destinationLoc?: string;
        remark?: string;
        registrar?: string;
        lines?: MoveLine[];
        readOnlyQty?: boolean;
    };

    // 仮データでの確認用。依存あり / 依存なしを直接開く
    if (sample === 'dependent') {
        return <MoveRegister initial={REGISTER_WITH_DEPENDENCY} />;
    }
    if (sample === 'plain') {
        return <MoveRegister initial={REGISTER_WITHOUT_DEPENDENCY} />;
    }

    if (state.view === 'complete' && state.moveNo && state.lines) {
        return <Navigate to="/SP405" replace state={state} />;
    }
    if (state.view === 'register' && state.lines) {
        return (
            <MoveRegister
                initial={{
                    view: 'register',
                    mode: state.dependent ? 'issue' : 'whole',
                    dependent: Boolean(state.dependent),
                    palletNo: state.palletNo || '',
                    lines: state.lines,
                    // SP401 の「パレット毎移動する」からは数量編集禁止、「内容確定」からは編集可
                    readOnlyQty: Boolean(state.readOnlyQty),
                }}
            />
        );
    }
    return <MoveRegister initial={REGISTER_WITH_DEPENDENCY} />;
};

export default SP402;
