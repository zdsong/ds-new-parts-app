import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormInput from './FormInput';
import { spQuantityInputSx, spSx } from '../styles/spSx';

/** 操作できないときの増減ボタン（押せないことが分かる見た目にする） */
const stepperButtonDisabled: React.CSSProperties = {
    ...spSx.stepperButton,
    color: '#bdbdbd',
    backgroundColor: '#f5f5f5',
    cursor: 'default',
};

/**
 * 数量入力（－ 入力 ＋）
 *
 * SP305 の明細カードの数量欄を基準に共通化したもの。
 * 明細カード（SP302 の検索結果／SP303・SP305 の追加品目）で同じ見た目にするため、
 * 数量欄は必ずこのコンポーネントを使う。
 *
 * 入力欄は FormInput（number）をそのまま使う。FormInput は値を持たないため、
 * ± ボタンで変更したときはフォームの値もあわせて書き換える（表示を追従させる）。
 */
interface SpQuantityInputProps {
    /** 現在の数量（呼び出し元の state が持つ値） */
    value: number;
    /** 数量の変更通知 */
    onChange: (value: number) => void;
    /** FormInput の source（既定：quantity） */
    source?: string;
    /** 増減の下限（既定：0） */
    min?: number;
    /** 操作不可（追加済みなど） */
    disabled?: boolean;
    /**
     * 外枠（－ 入力 ＋）の追加スタイル。
     * 「追加」ボタンと横並びにする画面では flexBasis を指定して折り返しを制御する。
     */
    style?: React.CSSProperties;
}

const SpQuantityInput: React.FC<SpQuantityInputProps> = ({
    value,
    onChange,
    source = 'quantity',
    min = 0,
    disabled = false,
    style,
}) => {
    // 同じカード内の SimpleForm（react-hook-form）の値を直接書き換えるために使う
    const form = useFormContext();

    /** 入力値を数量として扱える形にそろえる（空・不正値は下限、小数は切り捨て） */
    const normalize = (input: unknown): number => {
        if (input === '' || input === null || input === undefined) return min;
        const parsed = Number(input);
        if (!Number.isFinite(parsed)) return min;
        return Math.max(min, Math.floor(parsed));
    };

    /** ± ボタンによる増減（フォームの値も更新して表示を追従させる） */
    const step = (delta: number) => {
        if (disabled) return;
        const next = normalize(value + delta);
        onChange(next);
        form?.setValue?.(source, next, { shouldDirty: true });
    };

    return (
        <div style={{ ...spSx.stepper, ...style }}>
            <button
                type="button"
                style={disabled ? stepperButtonDisabled : spSx.stepperButton}
                aria-label="数量を減らす"
                disabled={disabled}
                onClick={() => step(-1)}
            >
                －
            </button>
            <FormInput
                type={'number'}
                source={source}
                structure="left-right"
                sx={spQuantityInputSx}
                defaultValue={value}
                disabled={disabled}
                slotProps={{ htmlInput: { inputMode: 'numeric', min } }}
                onChange={(next) => onChange(normalize(next))}
            />
            <button
                type="button"
                style={disabled ? stepperButtonDisabled : spSx.stepperButton}
                aria-label="数量を増やす"
                disabled={disabled}
                onClick={() => step(1)}
            >
                ＋
            </button>
        </div>
    );
};

export default SpQuantityInput;
