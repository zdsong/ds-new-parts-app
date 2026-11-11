import { Directions } from '@mui/icons-material';
import React, { useCallback } from 'react';
import { 
    AutocompleteInput, CheckboxGroupInput, required as requiredValidator,
    BooleanInput, DateInput, NumberInput, PasswordInput, 
    RadioButtonGroupInput, SelectInput, TextInput, Validator,
} from 'react-admin';

// ラベル付き入力コンポーネントProps型定義
interface CustomInputProps {
    type?: 'text' | 'number' | 'boolean' | 'select' | 'date' | 'datetime' | 'daterange' | 'password' | 'radio' | 'filter-select' | 'multiple-choice' | 'image';
    source?: string;
    label?: string | boolean;
    choices?: any;
    helperText?: string;
    validate?: Validator | Validator[];
    disabled?: boolean;
    onChange?: (value: any) => void | null | Promise<void>;
    onBlur?: (value: any) => void | null | Promise<void>;
    placeholder?: string;
    required?: boolean;
    multiline?:boolean;
    structure?: 'left-right' | 'top-bottom';
    readOnly?:boolean;
    defaultValue?:any;
    value?:any;
    sx?: any;
}

// 入力コンテナ基本スタイル
const inputContainer = {
    flex: 1,
    marginTop: 0,
    '& .MuiFormHelperText-sizeSmall': { display: 'none' }
}

// 基本入力フィールドスタイル（高さ/パディング調整）
const inputSx = {
    '& .MuiInputLabel-root': { display: 'none' },  // 原生ラベルを非表示
    '& .MuiInputBase-root ': {
        height: '50px',
        padding: '10px',
        borderRadius: '5px',
        border: 0,
    },
    '& .MuiInputBase-input': {
        paddingTop: '0px',
        paddingBottom: '0px',
        paddingLeft: '5px',
    },
    '& .MuiFormControl-root': { marginTop: 0 },
    '& .Mui-disabled': { backgroundColor: 'gainsboro' }, // 無効状態の背景色
    '& .MuiFormHelperText-root': { display: 'none' },    // ヘルパーテキストを非表示
    ...inputContainer
}

// コンポーネントコンテナスタイル（上下配置固定）
const attributeTopBottomSx = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    position: 'relative',  // 絶対配置のラベル用
    marginTop: '5px',
    width: '100%'
}

// フローティングラベル付き入力コンポーネント
const LabelInput: React.FC<CustomInputProps> = ({
    type = 'text',
    source= '',
    onChange,
    onBlur,
    placeholder = '',
    disabled = false,
    required = false,
    choices = [],
    label = '',
    helperText = '',
    structure = 'left-right',
    validate,
    readOnly,
    multiline = false,
    sx = {},
    value,
    defaultValue,
    ...props
}) => {
    // 共通変更イベント処理（数値文字列→数値変換対応）
    const commonHandleComponentChange = useCallback(async (...args: any[]) => {
        if (disabled || readOnly || !onChange) return;
        // 値の抽出（イベントオブジェクト/直接値に対応）
        const value = args[0]?.target?.value ?? args[1] ?? args[0];
        // 数値文字列の場合は数値に変換
        const valueToPass = typeof value === 'string' && /^\d+$/.test(value) 
            ? Number(value) 
            : value;
        await onChange(valueToPass);
    }, [disabled, readOnly, onChange]);

    // Blurイベント処理
    const handleInputBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (disabled || readOnly || !onBlur) return;
        await onBlur(e.target.value);
    }, [disabled, readOnly, onBlur]);

    const slotProps = {
        htmlInput: {
            autoComplete: 'off',
            autoCorrect: 'off',
            autoCapitalize: 'off',
        }
    }

    // 入力コンポーネントレンダリング（text/passwordのみ対応）
    const renderInput = () => {
        switch (type) {
            case 'password': // パスワード入力
                return (
                    <PasswordInput
                        sx={{...inputSx, ...sx?.input}}
                        helperText = {helperText? helperText: false}
                        source= {source}
                        value={value} 
                        label=""
                        validate={validate}
                        disabled={disabled}
                        readOnly={readOnly}
                        defaultValue={defaultValue}
                        placeholder={placeholder}
                        onChange={commonHandleComponentChange}
                        slotProps={slotProps}
                    />
                );
            
            case 'text': // テキスト入力（複数行対応）
                return (
                    <TextInput
                        sx={{...inputSx, ...sx?.input}}
                        helperText = {helperText? helperText: false}
                        source= {source}
                        value={value} 
                        label=""
                        validate={validate}
                        disabled={disabled}
                        multiline={multiline}
                        readOnly={readOnly}
                        defaultValue={defaultValue}
                        placeholder={placeholder}
                        onChange={commonHandleComponentChange}
                        onBlur={handleInputBlur}
                        slotProps={slotProps}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div style={attributeTopBottomSx as React.CSSProperties}>
            {/* フローティングラベル（入力框上部に重ねて表示） */}
            {label && (
                <div
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '20px',
                  backgroundColor: 'white', // 背景を白で隠す
                  zIndex: 10                 // 入力框より手前に表示
                }}
                >
                    <label>{label}</label>
                </div>
            )}
            {/* 入力コンポーネント */}
            {renderInput()}
        </div>
    );
};

export default LabelInput;