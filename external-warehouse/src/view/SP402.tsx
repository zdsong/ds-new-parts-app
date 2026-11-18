import React, { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpPagination from '../compontent/SpPagination';
import { spFormInputSx, spSx } from '../styles/spSx';
import { normalizeChoiceValue } from '../utils/palletData';

/**
 * 移動依頼確認画面（SP402）
 *
 * 設計書：③移動管理 1. パレットを移動先へ送る場合（移動元）
 *   移動登録（SP401）の「移動依頼を確認する（別画面を起動）」から開く別画面。
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
        requestNo: 'L-261014-002',
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

const SP402: React.FC = () => {
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

export default SP402;
