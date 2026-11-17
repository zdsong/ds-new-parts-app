import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpQuantityInput from '../compontent/SpQuantityInput';
import { spFormInputSx, spSx } from '../styles/spSx';
import { CATEGORY_CHOICES, createDetailFromItem, searchItems } from '../utils/palletData';
import type { ItemMaster, PalletDetailItem, PalletFormData } from '../utils/palletData';

/**
 * 品目検索画面（SP302）
 *
 * 設計書：①パレット番号管理 3.1 積載製品の登録／積載部品の登録
 *   パレットに積載する製品（部品）を検索して登録する。
 *   - 基本情報（パレット番号）と検索条件は 1 枚のカードにまとめる。
 *   - 検索条件の「製品／部品」は前画面（SP301）で選んだ区分で固定し、変更できない。
 *   - 検索結果は 品目コード・品目名・数量 の 3 項目のみ。数量は入力欄で直接変更できる。
 *   右上の「確認」でパレット番号発番（SP303）へ進む。
 */
interface Sp302State {
    /** 区分（1:製品 / 2:部品） */
    category?: string;
    /** 既に追加済みの積載明細 */
    details?: PalletDetailItem[];
    /** 戻り先のパレット情報（SP303／SP305 から遷移した場合） */
    pallet?: PalletFormData;
    /** 確認後の戻り先（'/SP303' または '/SP305'）。未指定なら SP303 へ */
    returnTo?: string;
}

/**
 * 基本情報の 2 つ目の入力枠の固定値
 * 項目名・機能が未確定のため、いったんラベルの無い固定値の枠として表示する。
 * 仕様が決まったら、この値を差し替えるか項目を追加する。
 */
const FIXED_FIELD_VALUE = '－';

/** 検索結果の数量入力の初期値（設計書の画面イメージに合わせて 10） */
const DEFAULT_QUANTITY = 10;

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

    const state = (location.state || {}) as Sp302State;

    // 区分（前画面から引き継ぐ。未指定時は製品）。検索条件では変更できない
    const [category] = useState<string>(state.category || '1');
    // 積載明細（前画面から引き継いだ内容に、検索結果から追加していく）
    const [details, setDetails] = useState<PalletDetailItem[]>(state.details || []);
    // 検索条件（確定値）
    const [condition, setCondition] = useState({ itemCode: '', itemName: '' });
    // 検索条件フォームの初期値（クリア時に再描画する）
    const [formKey, setFormKey] = useState(0);
    // 追加した品目の開閉状態
    const [addedOpen, setAddedOpen] = useState(false);
    // 検索結果ごとの数量（品目コード → 入力値）
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // 検索結果（区分・品目コード・品目名で絞り込む）
    const results = useMemo(
        () => searchItems(category, condition.itemCode, condition.itemName),
        [category, condition]
    );

    // 既に追加済みの品目コード
    const addedItemCodes = useMemo(() => details.map((detail) => detail.itemCode), [details]);

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        setCondition({
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
        });
    };

    /** 検索条件をクリアする */
    const handleClear = () => {
        setCondition({ itemCode: '', itemName: '' });
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

    /** 追加した明細を取り消す */
    const handleRemove = (id: string) => {
        setDetails((prev) => prev.filter((detail) => detail.id !== id));
    };

    /** 確認：積載明細を引き継いで次の画面へ進む */
    const handleConfirm = () => {
        if (details.length === 0) {
            notify('積載する品目を追加してください。', { type: 'warning' });
            return;
        }
        const nextState = { category, details, pallet: state.pallet };
        navigate(state.returnTo || '/SP303', { state: nextState });
    };

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー（右：確認） */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>品目検索</label>
                <Typography sx={spSx.actionLink} component="span" onClick={handleConfirm}>
                    確認
                </Typography>
            </Box>

            {/* 基本情報と検索条件を 1 枚のカードにまとめる */}
            <Box sx={spSx.card}>
                <SimpleForm
                    key={formKey}
                    sx={{ width: '100%', padding: '0' }}
                    onSubmit={handleSearch}
                    toolbar={false}
                    defaultValues={{
                        palletNo: state.pallet?.palletNo || '',
                        fixedField: FIXED_FIELD_VALUE,
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
                        {/* 項目名・機能が未確定のため、ラベルの無い固定枠として表示する */}
                        <FormInput
                            type={'text'}
                            source="fixedField"
                            label={false}
                            structure="top-bottom"
                            sx={spFormInputSx}
                            disabled
                        />

                        {/* 追加した品目（開閉可） */}
                        <div
                            style={{ ...spSx.sectionTitle, cursor: 'pointer' }}
                            onClick={() => setAddedOpen((open) => !open)}
                        >
                            <span>{`■追加した品目（${details.length}件）`}</span>
                            <span style={{ marginLeft: 'auto', color: '#5f5f5f', fontSize: '12px' }}>
                                {addedOpen ? '▲' : '▼'}
                            </span>
                        </div>
                        {addedOpen && (
                            <>
                                {details.length === 0 ? (
                                    <div style={spSx.empty}>追加した品目はありません。</div>
                                ) : (
                                    details.map((detail, index) => (
                                        <div key={detail.id} style={spSx.itemCard}>
                                            <div style={spSx.itemHeader}>
                                                <span style={spSx.itemTitle}>
                                                    {`No.${index + 1} ${detail.itemCode}`}
                                                </span>
                                                <span
                                                    style={spSx.linkDanger}
                                                    onClick={() => handleRemove(detail.id)}
                                                >
                                                    削除
                                                </span>
                                            </div>
                                            <div style={spSx.row}>
                                                <span style={spSx.rowLabelFixed}>品目名</span>
                                                <span style={spSx.rowValue}>{detail.itemName}</span>
                                            </div>
                                            <div style={spSx.row}>
                                                <span style={spSx.rowLabelFixed}>数量</span>
                                                <span style={spSx.rowValue}>{detail.quantity}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

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
                            choices={CATEGORY_CHOICES}
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
            <Box sx={spSx.sectionTitle}>{`■検索結果：${results.length}件`}</Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {results.length === 0 ? (
                    <div style={spSx.empty}>該当する品目がありません。</div>
                ) : (
                    results.map((item) => {
                        const added = addedItemCodes.includes(item.itemCode);
                        return (
                            <div key={item.id} style={spSx.itemCard}>
                                {/* 数量は FormInput を使うため、カードごとにフォームを持つ */}
                                <SimpleForm
                                    id={`sp302-item-${item.id}`}
                                    sx={{ width: '100%', padding: '0' }}
                                    onSubmit={() => {}}
                                    toolbar={false}
                                    defaultValues={{
                                        quantity: getQuantity(item.itemCode),
                                    }}
                                >
                                    <div style={{ ...formColumn, gap: '6px' }}>
                                        <div style={spSx.row}>
                                            <span style={spSx.rowLabelFixed}>品目コード</span>
                                            <span style={spSx.rowValue}>{item.itemCode}</span>
                                        </div>
                                        <div style={spSx.row}>
                                            <span style={spSx.rowLabelFixed}>品目名</span>
                                            <span style={spSx.rowValue}>{item.itemName}</span>
                                        </div>
                                        {/* 幅が狭いときは「追加」を次の行へ折り返す */}
                                        <div
                                            style={{
                                                ...spSx.row,
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <span style={spSx.rowLabelFixed}>数量</span>
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
                                </SimpleForm>
                            </div>
                        );
                    })
                )}
            </Box>
        </Box>
    );
};

export default SP302;
