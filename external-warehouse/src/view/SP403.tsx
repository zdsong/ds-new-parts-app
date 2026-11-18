import React, { useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpPagination from '../compontent/SpPagination';
import useApiRequest from '../adapters/apiUtil';
import { spFormInputSx, spSx } from '../styles/spSx';
import { normalizeChoiceValue } from '../utils/palletData';
import type { ApiPallet, OptionItem } from '../utils/palletData';

/**
 * 在庫確認画面（SP403）
 *
 * 設計書：③移動管理 1. パレットを移動先へ送る場合（移動元）
 *   移動登録（SP401）の「在庫を確認する（別画面を起動）」から開く別画面。
 *   移動元（倉庫）に現在どの品目がいくつ保管されているかを、
 *   保管先・品目コード・品目名で絞り込んで確認する。
 *
 * 画面構成（設計書の画面イメージに合わせる）
 *   ・検索条件…保管先／品目コード／品目名。クリア／検索で絞り込む。
 *   ・検索結果…1 件 1 カード。品目コード／品目名／保管数／パレット番号／保管場所。
 *   ・ページ番号の下に「閉じる」（移動登録 SP401 へ戻る）。
 *
 * 補足：在庫専用の API がまだ無いため、パレット一覧（GET /api/pallet/list）を
 *       在庫として読み替え、積載明細を 1 件 1 行に展開して表示する。
 *       在庫専用 API ができたら fetchStock の呼び出し先を差し替える。
 */

/** 一覧の 1 行分（＝パレットに積載された品目 1 件） */
interface StockRow {
    /** 行の一意キー（パレット番号＋品目コード＋連番） */
    key: string;
    /** 品目コード */
    itemCode: string;
    /** 品目名 */
    itemName: string;
    /** 保管数 */
    quantity: number;
    /** パレット番号 */
    palletNo: string;
    /** 倉庫名 */
    warehouseName: string;
    /** ロケ番 */
    locationNo: string;
}

/** 検索条件の初期値 */
const INITIAL_CONDITION = {
    whCd: '',
    itemCode: '',
    itemName: '',
};

/** 1 ページあたりの表示件数（スマートフォンで見やすい件数にする） */
const PAGE_SIZE = 5;

/**
 * 一覧取得時に 1 度に読み込むパレット数
 * パレット単位ではなく「積載明細＝在庫 1 件」でページ送りするため、
 * ページ単位ではなくまとめて取得し、画面側で 5 件ずつに区切る。
 */
const FETCH_PALLET_SIZE = 200;

/** カード内の項目（項目名＋値の縦積み） */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={spSx.field}>
        <span style={spSx.fieldLabel}>{label}</span>
        <span style={spSx.fieldValue}>{children}</span>
    </div>
);

const SP403: React.FC = () => {
    const navigate = useNavigate();
    const { request } = useApiRequest();

    // 検索条件（確定値）
    const [condition, setCondition] = useState(INITIAL_CONDITION);
    // 検索条件フォームの初期値（クリア時に再描画する）
    const [formKey, setFormKey] = useState(0);
    // 現在のページ
    const [page, setPage] = useState(1);

    // 倉庫の選択肢
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    // 在庫（パレットの積載明細を展開したもの）
    const [rows, setRows] = useState<StockRow[]>([]);
    // 検索を開始できる状態か（倉庫の初期値を決めてから取得する）
    const [ready, setReady] = useState(false);

    /** 保管先の選択肢を取得し、設計書どおり「外部倉庫」を初期値にする */
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const result = await request('get', 'api/common/wh/options', {}, {}, false, false);
                const options: OptionItem[] = result?.data || [];
                setWarehouseOptions(options);

                // 設計書の画面イメージでは保管先に「外部倉庫」が入っている。
                // 外部倉庫が選択肢に無い環境では未選択（すべて）のままにする。
                const external = options.find((option) => (option.value || '').includes('外部倉庫'));
                if (external) {
                    setCondition((prev) =>
                        prev.whCd ? prev : { ...prev, whCd: String(external.key) }
                    );
                    setFormKey((key) => key + 1);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setReady(true);
            }
        };
        fetchWarehouses();
    }, []);

    /** 検索条件に一致する在庫を取得する */
    useEffect(() => {
        if (!ready) return;
        const fetchStock = async () => {
            try {
                const result = await request(
                    'get',
                    'api/pallet/list',
                    {
                        whCd: condition.whCd,
                        itemCode: condition.itemCode,
                        itemName: condition.itemName,
                    },
                    { current: 1, pageSize: FETCH_PALLET_SIZE },
                    false,
                    false
                );
                const pallets: ApiPallet[] = result?.rows || [];

                // パレット 1 枚につき積載明細の数だけ行を作る
                const stockRows: StockRow[] = [];
                pallets.forEach((pallet) => {
                    const warehouseName = pallet.whNm || pallet.whCd || '';
                    const locationNo = pallet.locCd || '';
                    (pallet.details || []).forEach((detail, index) => {
                        stockRows.push({
                            key: `${pallet.palletNo}-${detail.itemCode}-${index}`,
                            itemCode: detail.itemCode || '',
                            itemName: detail.itemName || '',
                            quantity: Number(detail.storageQty ?? 0),
                            palletNo: pallet.palletNo || '',
                            warehouseName,
                            locationNo,
                        });
                    });
                });
                setRows(stockRows);
            } catch (error) {
                console.error(error);
            }
        };
        fetchStock();
    }, [condition, ready]);

    const totalPage = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const startNo = rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endNo = Math.min(page * PAGE_SIZE, rows.length);
    const pageRows = useMemo(
        () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [rows, page]
    );

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        setCondition({
            whCd: normalizeChoiceValue(values?.whCd),
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
        });
        setPage(1);
    };

    /** 検索条件をクリアする */
    const handleClear = () => {
        setCondition(INITIAL_CONDITION);
        setFormKey((key) => key + 1);
        setPage(1);
    };

    /** 別画面を閉じて移動登録（SP401）へ戻る */
    const handleClose = () => {
        navigate(-1);
    };

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>在庫検索</label>
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
                    defaultValues={condition}
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
                            source="whCd"
                            label="保管先"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={warehouseOptions}
                        />
                        <FormInput
                            type={'text'}
                            source="itemCode"
                            label="品目コード"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="入力してください"
                        />
                        <FormInput
                            type={'text'}
                            source="itemName"
                            label="品目名"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="入力してください"
                        />
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
                <span>{`■検索結果：${rows.length}件`}</span>
                <span style={{ color: '#5f5f5f', fontSize: '12px' }}>
                    {`${startNo} - ${endNo} 件を表示`}
                </span>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pageRows.length === 0 ? (
                    <div style={spSx.empty}>該当する在庫がありません。</div>
                ) : (
                    pageRows.map((row) => (
                        <div key={row.key} style={spSx.listCard}>
                            <Field label="品目コード">{row.itemCode}</Field>
                            <Field label="品目名">{row.itemName || '－'}</Field>
                            <Field label="保管数">{row.quantity}</Field>
                            <Field label="パレット番号">{row.palletNo}</Field>
                            <Field label="保管場所">
                                {`${row.warehouseName || '－'}/${row.locationNo || '－'}`}
                            </Field>
                        </div>
                    ))
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

export default SP403;
