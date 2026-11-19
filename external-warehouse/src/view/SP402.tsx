import React, { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpPagination from '../compontent/SpPagination';
import SpQuantityInput from '../compontent/SpQuantityInput';
import { spFormInputSx, spSx } from '../styles/spSx';
import { HOME_ROUTE } from '../utils/appRoutes';
import {
    MOVE_LOCATION_CHOICES,
    MOVE_REGISTRAR,
    MOVE_WAREHOUSE_CHOICES,
    completeMoveRegistration,
    moveWarehouseLabel,
} from '../utils/moveData';
import type { MoveCompleteState, MoveLine, MoveRegisterState } from '../utils/moveData';
import { normalizeChoiceValue, printPalletLabels } from '../utils/palletData';
import type { PalletDetailItem } from '../utils/palletData';

/**
 * 移動管理 4.2（SP402）
 *
 * 画面遷移図の 4.2 は次の 3 画面が同じ番号のため、1 つのルートで切り替える。
 *   search   … 移動依頼検索（SP401 のリンク）
 *   register … 移動登録（内容を確認 / パレット毎移動する）
 *   complete … 移動登録完了
 *
 * 設計書：③移動管理 1. パレットを移動先へ送る場合（移動元）
 *   移動登録（SP401）の「移動依頼検索」から開く別画面。
 *   移動元（外部倉庫）のパレットを移動先へ送る前に、
 *   対象の移動依頼番号・移動先・依頼者・移動希望日と、積載する品目の内容を確認する。
 *
 * 画面構成（設計書の画面イメージに合わせる）
 *   ・検索条件…移動先／移動希望日（開始 ～ 終了）。クリア／検索で絞り込む。
 *   ・検索結果…1 件 1 カード。移動依頼番号（リンク）／移動先／依頼者／移動希望日／備考と、
 *     折りたたみ式の「品目一覧」（品目コード・品目名・移動数・パレット番号・保管場所）。
 *   ・ページ番号の下に「閉じる」（移動登録 SP401 へ戻る）。
 *
 * 補足：バックエンドに移動依頼系の API が無いため、一覧はフロント側の仮データ。
 *       API 連携時は下の MOVE_REQUESTS を API 応答（例：GET /api/move-request/list）に置き換える。
 */

/** 移動依頼に含まれる品目 1 件分 */
interface MoveRequestItem {
    /** 品目コード */
    itemCode: string;
    /** 品目名 */
    itemName: string;
    /** 移動数 */
    moveQty: number;
    /** パレット番号 */
    palletNo: string;
    /** 保管場所（倉庫名／ロケ番） */
    storagePlace: string;
}

/** 移動依頼 1 件分 */
interface MoveRequest {
    id: string;
    /** 移動依頼番号 */
    requestNo: string;
    /** 移動先（1:行田工場 / 2:外部倉庫） */
    destination: string;
    /** 移動先のロケ番 */
    destinationLocation: string;
    /** 依頼者 */
    requester: string;
    /** 移動希望日（yyyy/MM/dd） */
    desiredDate: string;
    /** 備考 */
    remark: string;
    /** 品目一覧 */
    items: MoveRequestItem[];
}

/** 移動先の選択肢 */
const DESTINATION_CHOICES = [
    { key: '1', value: '行田工場' },
    { key: '2', value: '外部倉庫' },
];

/** コード→表示名の変換表 */
const DESTINATION_LABELS: Record<string, string> = Object.fromEntries(
    DESTINATION_CHOICES.map((choice) => [choice.key, choice.value])
);

/** 1 ページあたりの検索結果件数（スマートフォンで見やすい件数にする） */
const PAGE_SIZE = 5;

/** 検索条件の初期値 */
const INITIAL_CONDITION = {
    destination: '',
    desiredFrom: '',
    desiredTo: '',
};

/**
 * 仮データ（設計書の画面イメージに合わせた内容＋ページング確認用の行）
 * 外部倉庫のパレットを行田工場へ送る依頼が中心になる。
 */
const MOVE_REQUESTS: MoveRequest[] = [
    {
        id: '1',
        requestNo: 'I-261014-002',
        destination: '1',
        destinationLocation: 'A-1-2-3-4',
        requester: '山田 太郎（生産管理）',
        desiredDate: '2026/10/15',
        remark: 'XXXXXXXXXXXXXXXXXX',
        items: [
            {
                itemCode: 'TLR280LB-S400-401-BK-00',
                itemName: 'H400 背面化粧扉（ブラック）',
                moveQty: 10,
                palletNo: 'B261010-001',
                storagePlace: '外部倉庫/A-1-2-3-4',
            },
            {
                itemCode: 'TLP280LB-S400N-301-BK-01',
                itemName: 'H400 捺印扉（ブラック）',
                moveQty: 10,
                palletNo: 'B261010-002',
                storagePlace: '外部倉庫/B-1-2-3-4',
            },
        ],
    },
    {
        id: '2',
        requestNo: 'L-261013-001',
        destination: '1',
        destinationLocation: 'B-1-2-3-4',
        requester: '佐藤 花子（生産管理）',
        desiredDate: '2026/10/14',
        remark: '午前中に搬出',
        items: [
            {
                itemCode: 'GP20A-101-RN-NAV3-00',
                itemName: 'アルミ支柱 A',
                moveQty: 20,
                palletNo: 'B261009-003',
                storagePlace: '外部倉庫/C-1-1-1-2',
            },
        ],
    },
    {
        id: '3',
        requestNo: 'L-261012-003',
        destination: '1',
        destinationLocation: 'C-1-1-2-3',
        requester: '鈴木 一郎（生産管理）',
        desiredDate: '2026/10/12',
        remark: '',
        items: [
            {
                itemCode: 'TLR560LB-S400-200-00',
                itemName: '本体ASSY H400',
                moveQty: 5,
                palletNo: 'B261008-002',
                storagePlace: '外部倉庫/A-2-1-1-1',
            },
            {
                itemCode: 'V15FSM-100-00',
                itemName: '本体ASSY',
                moveQty: 8,
                palletNo: 'B261008-002',
                storagePlace: '外部倉庫/A-2-1-1-1',
            },
        ],
    },
    {
        id: '4',
        requestNo: 'L-261010-001',
        destination: '1',
        destinationLocation: 'A-2-1-1-1',
        requester: '高橋 美咲（生産管理）',
        desiredDate: '2026/10/10',
        remark: '至急',
        items: [
            {
                itemCode: 'HP30C-310-RN-NBV2-01',
                itemName: '化粧キャップ C',
                moveQty: 30,
                palletNo: 'B261006-001',
                storagePlace: '外部倉庫/B-2-3-4-5',
            },
        ],
    },
    {
        id: '5',
        requestNo: 'L-261008-004',
        destination: '2',
        destinationLocation: 'B-2-3-4-5',
        requester: '伊藤 健（生産管理）',
        desiredDate: '2026/10/08',
        remark: '',
        items: [
            {
                itemCode: 'TLR280LB-S400-301-BK-01',
                itemName: 'H400 接着扉（ブラック）',
                moveQty: 12,
                palletNo: 'B261004-005',
                storagePlace: '外部倉庫/D-1-2-3-4',
            },
        ],
    },
    {
        id: '6',
        requestNo: 'L-261005-002',
        destination: '1',
        destinationLocation: 'D-1-2-3-4',
        requester: '渡辺 由紀（生産管理）',
        desiredDate: '2026/10/05',
        remark: '割れ物注意',
        items: [
            {
                itemCode: 'TLR280LB-S400-401-BK-00',
                itemName: 'H400 背面化粧扉（ブラック）',
                moveQty: 6,
                palletNo: 'B261001-004',
                storagePlace: '外部倉庫/A-1-2-3-4',
            },
            {
                itemCode: 'TLP280LB-S400N-301-BK-01',
                itemName: 'H400 捺印扉（ブラック）',
                moveQty: 4,
                palletNo: 'B261001-005',
                storagePlace: '外部倉庫/C-2-2-2-2',
            },
        ],
    },
];

/** 数字だけを取り出す（日付は「yyyy/MM/dd」と「yyyy-MM-dd」が混在するため比較用に使う） */
const digitsOnly = (value: string): string => (value || '').replace(/[^0-9]/g, '');

/** カード内の項目（項目名＋値の縦積み） */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={spSx.field}>
        <span style={spSx.fieldLabel}>{label}</span>
        <span style={spSx.fieldValue}>{children}</span>
    </div>
);

const MoveRequestSearch: React.FC = () => {
    const navigate = useNavigate();

    // 検索条件（確定値）
    const [condition, setCondition] = useState(INITIAL_CONDITION);
    // 検索条件フォームの初期値（クリア時に再描画する）
    const [formKey, setFormKey] = useState(0);
    // 現在のページ
    const [page, setPage] = useState(1);
    // 品目一覧の開閉状態（移動依頼 ID → 開いているか）
    const [openItems, setOpenItems] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(MOVE_REQUESTS.map((request) => [request.id, true]))
    );

    /** 検索条件で絞り込んだ移動依頼 */
    const filtered = useMemo(() => {
        const from = digitsOnly(condition.desiredFrom);
        const to = digitsOnly(condition.desiredTo);

        return MOVE_REQUESTS.filter((request) => {
            if (condition.destination && request.destination !== condition.destination) {
                return false;
            }
            // 移動希望日は日付部分だけで範囲比較する
            const desiredDate = digitsOnly(request.desiredDate);
            if (from && desiredDate < from) return false;
            if (to && desiredDate > to) return false;
            return true;
        });
    }, [condition]);

    const totalPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const startNo = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endNo = Math.min(page * PAGE_SIZE, filtered.length);
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        setCondition({
            destination: normalizeChoiceValue(values?.destination),
            desiredFrom: values?.desiredFrom || '',
            desiredTo: values?.desiredTo || '',
        });
        setPage(1);
    };

    /** 検索条件をクリアする（一覧も全件に戻す） */
    const handleClear = () => {
        setCondition(INITIAL_CONDITION);
        setFormKey((key) => key + 1);
        setPage(1);
    };

    /** 品目一覧の開閉を切り替える */
    const toggleItems = (id: string) => {
        setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    /** 別画面を閉じて移動登録（SP401）へ戻る */
    const handleClose = () => {
        navigate(-1);
    };

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>移動依頼検索</label>
            </Box>

            {/* 検索条件 */}
            <Box sx={spSx.sectionTitle}>■検索条件</Box>
            <Box sx={spSx.card}>
                <SimpleForm
                    key={formKey}
                    // SimpleForm の CardContent は :last-child で下余白 24px を持つため、
                    // カード（spSx.card）側の余白に揃えて二重の余白を消す
                    sx={{
                        width: '100%',
                        padding: '0',
                        paddingBottom: '0 !important',
                    }}
                    onSubmit={handleSearch}
                    toolbar={false}
                    defaultValues={INITIAL_CONDITION}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            width: '100%',
                        }}
                    >
                        <FormInput
                            type={'filter-select'}
                            source="destination"
                            label="移動先"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={DESTINATION_CHOICES}
                        />
                        {/* 移動希望日は範囲指定（開始 ～ 終了） */}
                        <div style={spSx.field}>
                            <span style={spSx.fieldLabel}>移動希望日</span>
                            <div style={spSx.dateRangeRow}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <FormInput
                                        type={'input-date'}
                                        source="desiredFrom"
                                        label={false}
                                        structure="top-bottom"
                                        sx={{ ...spFormInputSx, marginTop: 0 }}
                                    />
                                </Box>
                                <span style={{ color: '#5f5f5f', fontSize: '13px' }}>～</span>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <FormInput
                                        type={'input-date'}
                                        source="desiredTo"
                                        label={false}
                                        structure="top-bottom"
                                        sx={{ ...spFormInputSx, marginTop: 0 }}
                                    />
                                </Box>
                            </div>
                        </div>
                    </div>
                    <div style={spSx.buttonBar}>
                        <button style={spSx.secondaryButton} type="button" onClick={handleClear}>
                            クリア
                        </button>
                        <button style={spSx.primaryButton} type="submit">
                            検索
                        </button>
                    </div>
                </SimpleForm>
            </Box>

            {/* 検索結果 */}
            <Box sx={{ ...spSx.sectionTitle, justifyContent: 'space-between' }}>
                <span>{`■検索結果：${filtered.length}件`}</span>
                <span style={{ color: '#5f5f5f', fontSize: '12px' }}>
                    {`${startNo} - ${endNo} 件を表示`}
                </span>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pageRows.length === 0 ? (
                    <div style={spSx.empty}>該当する移動依頼がありません。</div>
                ) : (
                    pageRows.map((request) => {
                        const open = openItems[request.id] !== false;
                        return (
                            <div key={request.id} style={spSx.listCard}>
                                <Field label="移動依頼番号">
                                    <span
                                        style={spSx.cardLink}
                                        onClick={() => toggleItems(request.id)}
                                    >
                                        {request.requestNo}
                                    </span>
                                </Field>
                                <Field label="移動先">
                                    {`${DESTINATION_LABELS[request.destination] || '－'}/${
                                        request.destinationLocation
                                    }`}
                                </Field>
                                <Field label="依頼者">{request.requester}</Field>
                                <Field label="移動希望日">{request.desiredDate}</Field>
                                <Field label="備考">{request.remark || '－'}</Field>

                                {/* 品目一覧（設計書では見出しの右の記号で開閉する） */}
                                <div style={spSx.subSection}>
                                    <div
                                        style={spSx.subSectionHeader}
                                        onClick={() => toggleItems(request.id)}
                                        role="button"
                                        aria-expanded={open}
                                        aria-label="品目一覧の開閉"
                                    >
                                        <span>品目一覧</span>
                                        <span style={{ fontSize: '14px', lineHeight: 1 }}>
                                            {open ? '−' : '＋'}
                                        </span>
                                    </div>
                                    {open &&
                                        request.items.map((item, index) => (
                                            <div
                                                key={`${request.id}-${item.itemCode}-${index}`}
                                                style={spSx.subItem}
                                            >
                                                <span style={spSx.subItemLabel}>品目コード</span>
                                                <span style={spSx.subItemValue}>
                                                    {item.itemCode}
                                                </span>
                                                <span style={spSx.subItemLabel}>品目名</span>
                                                <span style={spSx.subItemValue}>
                                                    {item.itemName}
                                                </span>
                                                <span style={spSx.subItemLabel}>移動数</span>
                                                <span style={spSx.subItemValue}>{item.moveQty}</span>
                                                <span style={spSx.subItemLabel}>
                                                    パレット番号
                                                </span>
                                                <span style={spSx.subItemValue}>
                                                    {item.palletNo}
                                                </span>
                                                <span style={spSx.subItemLabel}>保管場所</span>
                                                <span style={spSx.subItemValue}>
                                                    {item.storagePlace}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </Box>

            {/* ページ送り */}
            <SpPagination page={page} totalPage={totalPage} onChange={setPage} />

            {/* ページ送りの下に置く閉じるボタン */}
            <Box sx={spSx.bottomActionBar}>
                <Box
                    component="button"
                    type="button"
                    sx={spSx.closeButton}
                    onClick={handleClose}
                >
                    閉じる
                </Box>
            </Box>
        </Box>
    );
};

/** 移動登録（新規発番 / パレット毎）。数量の初期値は依頼数量、依頼が無ければ保管数量 */
const MoveRegister: React.FC<{ initial: MoveRegisterState }> = ({ initial }) => {
    const navigate = useNavigate();
    const notify = useNotify();
    const [lines, setLines] = useState<MoveLine[]>(initial.lines.map((line) => ({ ...line })));
    const [warehouse, setWarehouse] = useState('gyoda');
    const [location, setLocation] = useState('A-1-2-3-4');
    const [remark, setRemark] = useState('');
    const [formKey, setFormKey] = useState(0);
    const [openId, setOpenId] = useState<string | null>(
        initial.mode === 'issue' ? initial.lines.find((line) => line.request)?.id ?? null : null
    );
    const editable = initial.mode === 'issue';
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
        navigate('/SP402', {
            replace: true,
            state: completeMoveRegistration({
                mode: initial.mode,
                palletNo: initial.palletNo,
                destinationWh: warehouse,
                destinationLoc: location,
                remark,
                lines,
            }),
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
                            placeholder={editable ? '未発番' : ''}
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
                            {editable ? (
                                <span style={spSx.linkDanger} onClick={() => handleRemove(line.id)}>
                                    削除
                                </span>
                            ) : null}
                        </div>
                        <Field label="品目名">{line.itemName}</Field>
                        {editable ? (
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
                    defaultValues={{ remark }}
                >
                    <FormInput
                        type={'text'}
                        source="remark"
                        label="備考"
                        structure="top-bottom"
                        sx={spFormInputSx}
                        onChange={(value) => setRemark(typeof value === 'string' ? value : '')}
                    />
                </SimpleForm>
                <Field label="移動登録者">{MOVE_REGISTRAR}</Field>
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

/** 移動登録完了。番号表印刷は既存のパレット番号表印刷を画面側だけで呼ぶ */
const MoveComplete: React.FC<{ result: MoveCompleteState }> = ({ result }) => {
    const navigate = useNavigate();
    const notify = useNotify();
    const destination = `${moveWarehouseLabel(result.destinationWh)}/${result.destinationLoc}`;

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
                    storageLocationName: moveWarehouseLabel(result.destinationWh),
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

/** 4.2 の 3 画面を state.view で切り替える */
const SP402: React.FC = () => {
    const location = useLocation();
    const state = (location.state || {}) as {
        view?: string;
        mode?: MoveRegisterState['mode'];
        moveNo?: string;
        palletNo?: string;
        destinationWh?: string;
        destinationLoc?: string;
        remark?: string;
        registrar?: string;
        lines?: MoveLine[];
    };

    if (state.view === 'complete' && state.moveNo && state.lines) {
        return <MoveComplete result={state as MoveCompleteState} />;
    }
    if (state.view === 'register' && state.lines && state.mode) {
        return <MoveRegister initial={state as MoveRegisterState} />;
    }
    return <MoveRequestSearch />;
};

export default SP402;
