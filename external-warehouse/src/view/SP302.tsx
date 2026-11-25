import React, { useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpQuantityInput from '../compontent/SpQuantityInput';
import SpPagination from '../compontent/SpPagination';
import useApiRequest from '../adapters/apiUtil';
import { spFormInputSx, spSx, SP_VALUE_INDENT, spSquareReadonlyStyle } from '../styles/spSx';
import {
    DEFAULT_QUANTITY,
    createDetailFromItem,
} from '../utils/palletData';
import type { ItemMaster, OptionItem, PalletDetailItem, PalletFormData } from '../utils/palletData';

/**
 * 品目検索画面（SP302）
 *
 * 設計書：①パレット番号管理 3.1 積載製品の登録／積載部品の登録
 *   パレットに積載する製品（部品）を検索して登録する。
 *   - 基本情報はパレット番号と、追加した品目の件数を表示する。件数は入力しない。
 *   - 検索条件の「製品／部品」は前画面（SP301）で選んだ区分で固定し、変更できない。
 *   - 検索結果は 品目コード・品目名・数量 の 3 項目のみ。数量は入力欄で直接変更できる。
 *   右上の「確認」でパレット番号発番（SP303）へ進む。
 *   ページ番号の下の「戻る」で、遷移元（SP301／SP303／SP305）へ戻る。
 */
interface Sp302State {
    /** 区分（1:製品 / 3:部品） */
    category?: string;
    /** 既に追加済みの積載明細 */
    details?: PalletDetailItem[];
    /** 戻り先のパレット情報（SP303／SP305 から遷移した場合） */
    pallet?: PalletFormData;
    /** 確認後の戻り先（'/SP303' または '/SP305'）。未指定なら SP303 へ */
    returnTo?: string;
}

/**
 * 追加した品目の件数表示（入力・選択はしない）
 */
const addedCountStyle: React.CSSProperties = {
    ...spSquareReadonlyStyle,
    marginLeft: SP_VALUE_INDENT,
    width: `calc(100% - ${SP_VALUE_INDENT})`,
};

/** 1 ページあたりの検索結果件数（スマートフォンで見やすい件数にする） */
const PAGE_SIZE = 5;

/** カード内の縦積みレイアウト */
const formColumn: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    minWidth: 0,
};

const SP302: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const notify = useNotify();
    const { request } = useApiRequest();

    const state = (location.state || {}) as Sp302State;

    // 区分（前画面から引き継ぐ。未指定時は製品）。検索条件では変更できない
    const [category] = useState<string>(state.category || '1');
    // 積載明細（前画面から引き継いだ内容に、検索結果から追加していく）
    const [details, setDetails] = useState<PalletDetailItem[]>(state.details || []);
    // 検索条件（確定値）
    const [condition, setCondition] = useState({ itemCode: '', itemName: '' });
    // 検索条件フォームの初期値（クリア時に再描画する）
    const [formKey, setFormKey] = useState(0);
    // 検索結果ごとの数量（品目コード → 入力値）
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // 検索結果（API から取得する）
    const [results, setResults] = useState<ItemMaster[]>([]);
    // 検索結果の総件数
    const [total, setTotal] = useState(0);
    // 現在のページ
    const [page, setPage] = useState(1);
    const [classificationOptions, setClassificationOptions] = useState<OptionItem[]>([]);

    // 既に追加済みの品目コード
    const addedItemCodes = useMemo(() => details.map((detail) => detail.itemCode), [details]);

    /** 区分の選択肢を辞書から取得する */
    useEffect(() => {
        const fetchClassification = async () => {
            try {
                const result = await request(
                    'post',
                    'api/common/options',
                    { cmdOptionName: 'bss_classification' },
                    {},
                    false,
                    false
                );
                setClassificationOptions(result?.data || []);
            } catch (error) {
                console.error(error);
            }
        };
        fetchClassification();
    }, []);

    /** 品目を検索する（区分は品目区分 1:製品 / 3:部品 で絞り込む） */
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const result = await request(
                    'get',
                    'api/item/list',
                    {
                        itemCode: condition.itemCode,
                        itemName: condition.itemName,
                        // 品目区分（1:製品 / 3:部品）で絞り込む
                        prhnmx: category,
                    },
                    { current: page, pageSize: PAGE_SIZE },
                    false,
                    false
                );
                setResults(result?.rows || []);
                setTotal(result?.total || 0);
            } catch (error) {
                console.error(error);
            }
        };
        fetchItems();
    }, [category, condition, page]);

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        setPage(1);
        setCondition({
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
        });
    };

    /** 検索条件をクリアする */
    const handleClear = () => {
        setCondition({ itemCode: '', itemName: '' });
        setPage(1);
        setFormKey((key) => key + 1);
    };

    /** 検索結果の数量（未入力なら既定値） */
    const getQuantity = (itemCode: string) => quantities[itemCode] ?? DEFAULT_QUANTITY;

    /** 数量の入力値を保持する */
    const handleQuantityChange = (itemCode: string, value: number) => {
        setQuantities((prev) => ({ ...prev, [itemCode]: value }));
    };

    /** 検索結果から積載明細を追加する（数量は入力値を使う） */
    const handleAdd = (item: ItemMaster) => {
        if (addedItemCodes.includes(item.itemCode)) return;
        const quantity = Math.max(1, getQuantity(item.itemCode));
        setDetails((prev) => [...prev, { ...createDetailFromItem(item), quantity }]);
    };

    /** 確認：積載明細を引き継いで次の画面へ進む */
    const handleConfirm = () => {
        if (details.length === 0) {
            notify('notify.pallet.add_items', { type: 'warning' });
            return;
        }
        const nextState = { category, details, pallet: state.pallet };
        navigate(state.returnTo || '/SP303', { state: nextState });
    };

    /**
     * 戻る：ひとつ前の画面へ戻る
     *
     * SP303／SP305 から「品目追加」で来た場合は、その画面へ編集途中の内容を
     * 引き継いで戻る（戻り先は遷移元が渡す returnTo）。SP301 から来た場合は
     * 製品・部品の選択に戻る。
     */
    const handleBack = () => {
        navigate(state.returnTo || '/SP301', {
            state: { category, details, pallet: state.pallet },
        });
    };

    const totalPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const startNo = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endNo = Math.min(page * PAGE_SIZE, total);

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー（画面名のみ） */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>品目検索</label>
            </Box>

            {/* タイトル直下の操作行（確認） */}
            <Box sx={spSx.titleActionBar}>
                <Box
                    component="button"
                    type="button"
                    sx={spSx.actionButton}
                    onClick={handleConfirm}
                >
                    確認
                </Box>
            </Box>

            {/* 基本情報と検索条件を 1 枚のカードにまとめる */}
            <Box sx={spSx.card}>
                <SimpleForm
                    key={formKey}
                    sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                    onSubmit={handleSearch}
                    toolbar={false}
                    defaultValues={{
                        palletNo: state.pallet?.palletNo || '',
                        itemCode: '',
                        itemName: '',
                        category,
                    }}
                >
                    <div style={formColumn}>
                        {/* 基本情報 */}
                        <div style={spSx.sectionTitle}>■基本情報</div>
                        <FormInput
                            type={'text'}
                            source="palletNo"
                            label="パレット番号"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="未発番"
                            disabled
                        />
                        <div style={addedCountStyle}>{`追加した品目（${details.length}件）`}</div>

                        {/* 検索条件（製品／部品は区分固定のため変更不可） */}
                        <div style={{ ...spSx.sectionTitle, marginTop: '4px' }}>■検索条件</div>
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
                        <FormInput
                            type={'select'}
                            source="category"
                            label="製品／部品"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={classificationOptions}
                            defaultValue={category}
                            disabled
                        />
                        <div style={spSx.buttonBar}>
                            <button style={spSx.secondaryButton} type="button" onClick={handleClear}>
                                クリア
                            </button>
                            <button style={spSx.primaryButton} type="submit">
                                検索
                            </button>
                        </div>
                    </div>
                </SimpleForm>
            </Box>

            {/* 検索結果（品目コード・品目名・数量の 3 項目のみ） */}
            <Box sx={{ ...spSx.sectionTitle, justifyContent: 'space-between' }}>
                <span>{`■検索結果：${total}件`}</span>
                <span style={{ color: '#5f5f5f', fontSize: '12px' }}>
                    {`${startNo} - ${endNo} 件を表示`}
                </span>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {results.length === 0 ? (
                    <div style={spSx.empty}>該当する品目がありません。</div>
                ) : (
                    results.map((item) => {
                        const added = addedItemCodes.includes(item.itemCode);
                        return (
                            <div key={item.itemCode} style={spSx.itemCard}>
                                {/* 数量は FormInput を使うため、カードごとにフォームを持つ */}
                                <SimpleForm
                                    id={`sp302-item-${item.itemCode}`}
                                    sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                                    onSubmit={() => {}}
                                    toolbar={false}
                                    defaultValues={{
                                        quantity: getQuantity(item.itemCode),
                                    }}
                                >
                                    <div style={{ ...formColumn, gap: '6px' }}>
                                        <div style={spSx.field}>
                                            <span style={spSx.fieldLabel}>品目コード</span>
                                            <span style={spSx.fieldValue}>{item.itemCode}</span>
                                        </div>
                                        <div style={spSx.field}>
                                            <span style={spSx.fieldLabel}>品目名</span>
                                            <span style={spSx.fieldValue}>{item.itemName}</span>
                                        </div>
                                        {/* ラベルは上、数量入力と「追加」は下に並べる */}
                                        <div style={spSx.field}>
                                            <span style={spSx.fieldLabel}>数量</span>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                            {/* 数量は SP305 の明細カードと同じ入力枠（－ 入力 ＋） */}
                                            <SpQuantityInput
                                                value={getQuantity(item.itemCode)}
                                                onChange={(value) =>
                                                    handleQuantityChange(item.itemCode, value)
                                                }
                                                min={1}
                                                disabled={added}
                                                style={{ flex: '1 1 140px' }}
                                            />
                                            {added ? (
                                                <span
                                                    style={{
                                                        ...spSx.link,
                                                        marginLeft: 'auto',
                                                        color: '#9e9e9e',
                                                        cursor: 'default',
                                                    }}
                                                >
                                                    追加済
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    style={spSx.smallButton}
                                                    onClick={() => handleAdd(item)}
                                                >
                                                    追加
                                                </button>
                                            )}
                                            </div>
                                        </div>
                                    </div>
                                </SimpleForm>
                            </div>
                        );
                    })
                )}
            </Box>

            {/* ページ送り（設計書 3.1 のページ番号の枠） */}
            <SpPagination page={page} totalPage={totalPage} onChange={setPage} />

            {/* ページ送りの下に置く戻るボタン（設計書 ①パレット番号管理 の画面下部） */}
            <Box sx={spSx.bottomActionBar}>
                <Box component="button" type="button" sx={spSx.backButton} onClick={handleBack}>
                    戻る
                </Box>
            </Box>
        </Box>
    );
};

export default SP302;
