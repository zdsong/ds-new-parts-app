import React, { useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpQuantityInput from '../compontent/SpQuantityInput';
import { spFormInputSx, spSx } from '../styles/spSx';
import {
    MOVE_LOCATION_CHOICES,
    MOVE_REGISTRAR,
    MOVE_WAREHOUSE_CHOICES,
    REGISTER_WITHOUT_DEPENDENCY,
    REGISTER_WITH_DEPENDENCY,
    completeMoveRegistration,
} from '../utils/moveData';
import type { MoveLine, MoveRegisterState } from '../utils/moveData';
import { normalizeChoiceValue } from '../utils/palletData';

/**
 * 移動登録画面（SP402）
 *
 * 設計書：③移動管理 1-3 移動登録。
 * 移動依頼は SP404、登録完了（1-4 パレット番号表印刷）は SP405。
 */

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
 * dependent=true  … ①品目を選んで新しいパレットを作る。依頼詳細と削除を出す。
 * dependent=false … ②パレット毎に送る。依頼詳細は出さない（設計書の「＋」は描き間違い）。
 */
const MoveRegister: React.FC<{ initial: MoveRegisterState }> = ({ initial }) => {
    const navigate = useNavigate();
    const notify = useNotify();
    const dependent = initial.dependent;
    const [lines, setLines] = useState<MoveLine[]>(initial.lines.map((line) => ({ ...line })));
    const [warehouse, setWarehouse] = useState('gyoda');
    const [location, setLocation] = useState('A-1-2-3-4');
    const [remark, setRemark] = useState('');
    const [registrar, setRegistrar] = useState(MOVE_REGISTRAR);
    const [formKey, setFormKey] = useState(0);
    const [openId, setOpenId] = useState<string | null>(
        dependent ? initial.lines.find((line) => line.request)?.id ?? null : null
    );
    const locations = MOVE_LOCATION_CHOICES[warehouse] || [];

    const handleWarehouse = (value: unknown) => {
        const next = normalizeChoiceValue(value);
        setWarehouse(next);
        setLocation('');
        setFormKey((key) => key + 1);
    };

    const handleRemove = (id: string) => {
        setLines((prev) => prev.filter((line) => line.id !== id));
    };

    const handleSubmit = () => {
        if (!warehouse || !location) {
            notify('移動先の倉庫とロケ番を選択してください。', { type: 'warning' });
            return;
        }
        if (lines.length === 0) {
            notify('移動する品目を追加してください。', { type: 'warning' });
            return;
        }
        if (lines.some((line) => line.moveQty <= 0)) {
            notify('移動数量を入力してください。', { type: 'warning' });
            return;
        }
        const result = completeMoveRegistration({
            mode: dependent ? 'issue' : 'whole',
            palletNo: dependent ? '' : initial.palletNo,
            destinationWh: warehouse,
            destinationLoc: location,
            remark,
            lines,
        });
        navigate('/SP405', {
            replace: true,
            state: { ...result, registrar },
        });
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
                            placeholder={dependent ? '未発番' : ''}
                            disabled
                        />
                        <FormInput
                            type={'filter-select'}
                            source="destinationWh"
                            label="移動先"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={MOVE_WAREHOUSE_CHOICES}
                            onChange={handleWarehouse}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="destinationLoc"
                            label="ロケ番"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={locations}
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
                            {dependent ? (
                                <span style={spSx.linkDanger} onClick={() => handleRemove(line.id)}>
                                    削除
                                </span>
                            ) : null}
                        </div>
                        <Field label="品目名">{line.itemName}</Field>
                        {dependent ? (
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
                                            onChange={(value) =>
                                                setLines((prev) =>
                                                    prev.map((item) =>
                                                        item.id === line.id ? { ...item, moveQty: value } : item
                                                    )
                                                )
                                            }
                                        />
                                        <span style={spSx.fieldValue}>{`/ ${line.storageQty}`}</span>
                                    </div>
                                </SimpleForm>
                            </div>
                        ) : (
                            <Field label="移動数量/保管数量">{`${line.moveQty} / ${line.storageQty}`}</Field>
                        )}
                        <Field label="パレット番号">{line.palletNo}</Field>
                        <Field label="保管場所">{line.storagePlace}</Field>
                        {dependent && line.request ? (
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
                <button type="button" style={spSx.primaryButton} onClick={handleSubmit}>
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
                }}
            />
        );
    }
    return <MoveRegister initial={REGISTER_WITH_DEPENDENCY} />;
};

export default SP402;
