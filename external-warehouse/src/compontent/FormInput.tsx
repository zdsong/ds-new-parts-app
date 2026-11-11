import React, { useCallback, useState, useEffect, forwardRef, useImperativeHandle, RefObject, useRef } from 'react';
import {
    AutocompleteInput, CheckboxGroupInput, required as requiredValidator,
    BooleanInput, DateInput, NumberInput, PasswordInput,
    RadioButtonGroupInput, SelectInput, TextInput, Validator,
    DateTimeInput,
} from 'react-admin';
import CustomImageInput from './CustomImageInput';
import CustomDateInput from './DateSelect';

// カスタム入力コンポーネントProps型定義
interface CustomInputProps {
    type?: 'text' | 'number' | 'boolean' | 'select' | 'date' | 'datetime' | 'date-range' | 'datetime-range' | 'password' | 'radio' | 'filter-select' | 'multiple-choice' | 'datetimerange'| 'text-number'| 'text-halfwidth' | 'image' | 'input-date' | 'input-daterange';
    source?: string;
    label?: string | boolean;
    choices?: any;
    slotProps?: any;
    helperText?: string;
    helperTextD?: boolean;
    validate?: Validator | Validator[];
    disabled?: boolean;
    onChange?: (value: any) => void | null | Promise<void>;
    onBlur?: (value: any) => void | null | Promise<void>;
    placeholder?: string;
    required?: boolean;
    multiline?: boolean;
    structure?: 'left-right' | 'top-bottom' // ラベルと入力の配置構造
    readOnly?: boolean;
    defaultValue?: any;
    value?: any;
    sx?: any;
    hideDeleteButton?: boolean;
    format?: any;
    multiple?: boolean;
}

export interface FormInputRefHandle {
    clear: () => void;
    focus: () => void;
    clearStartDate?: () => void;
    clearEndDate?: () => void;
  }

// 共通スタイル定義
// 入力コンテナ基本スタイル
const inputContainer = {
    flex: 1,
    marginTop: 0,
    '& .MuiFormHelperText-sizeSmall': {
        display: 'none'
    }
}

// 日付入力スタイル
const dateInputSx = {
    '& .MuiInputLabel-root': { display: 'none' },
    '& .MuiInputBase-input ': { height: '25.56px', paddingTop: '2px', paddingBottom: '0px' },
    '& .MuiInputBase-root': { borderRadius: '5px' },
    '& .Mui-disabled': { backgroundColor: 'gainsboro' },
    '& .MuiFormHelperText-root': { display: 'none' },
    ...inputContainer
}

// 日付入力スタイル
const dateSelectSx = {
    '& .MuiInputLabel-root': { display: 'none' },
    '& .MuiInputBase-input ': { height: '24px', padding: '2px 5px 0 5px' },
    '& .MuiInputBase-root': { borderRadius: '5px 0 0 5px' },
    '& .Mui-disabled': { backgroundColor: 'gainsboro' },
    '& .MuiFormHelperText-root': { display: 'none' },
    width: '100%',
    ...inputContainer
}

// セレクトボックススタイル
const selectInputSx = {
    '& .MuiInputLabel-root': { display: 'none' },
    '& .MuiInputBase-input ': { paddingTop: '2px', paddingBottom: '0px' },
    '& .MuiInputBase-root': { borderRadius: '5px' },
    '& .Mui-disabled': { backgroundColor: 'gainsboro' },
    '& .MuiFormHelperText-root': { display: 'none' },
    '& .MuiSelect-select': {
        paddingLeft: '5px'
    },
    ...inputContainer
}

// フィルタ用セレクトボックススタイル
const filterSelectInputSx = {
    '& .MuiInputLabel-root': { display: 'none' },
    '& .MuiInputBase-input ': { paddingTop: '2px', paddingBottom: '0px' },
    '& .MuiInputBase-root': { borderRadius: '5px', padding: 0, height: '25.56px' },
    '& .Mui-disabled': { backgroundColor: 'gainsboro' },
    '& .MuiFormHelperText-root': { display: 'none' },
    '& .MuiAutocomplete-input': {padding: '0 5px !important'},
    '& .MuiAutocomplete-tag': {margin: '0 3px !important'},
    ...inputContainer
}

// 基本入力フィールドスタイル
const inputSx = {
    '& .MuiInputLabel-root': { display: 'none' },
    '& .MuiInputBase-root ': { height: '25.56px', paddingTop: '2px', paddingBottom: '2px', borderRadius: '5px' },
    '& .MuiInputBase-input': { paddingTop: '0px', paddingBottom: '0px', paddingLeft: '5px' },
    '& .MuiFormControl-root': { marginTop: 0 },
    '& .Mui-disabled': { backgroundColor: 'gainsboro' },
    '& .MuiFormHelperText-root': { display: 'none' },
    ...inputContainer
}

// ラベルスタイル（左右配置）
const labelLeftRightSx = {
    width: '150px',
    paddingTop: '5px',
    display: 'flex',
    alignItems: 'center'
}

// ラベルスタイル（上下配置）
const labelTopBottomSx = {
    width: '100%',
    marginLeft: '5px',
    display: 'flex',
    alignItems: 'center'
}

// 属性コンテナスタイル（左右配置）
const attributeLeftRightSx = {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    gap: '1rem',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '5px',
    height: '30px'
}

// 属性コンテナスタイル（上下配置）
const attributeTopBottomSx = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    marginTop: '5px'
}

// ラジオボタンスタイル
const radioSx = {
    '& .MuiFormControlLabel-root': { marginLeft: 0, marginRight: 0, flex: '1' },
    '& .MuiFormGroup-root': { minHeight: 'auto', gap: '4px' },
    '& .MuiFormHelperText-root': { display: 'none' },
    width: '100%',
    height: '28px',
    marginBottom: '0',
    ...inputContainer
}

// 複数選択チェックボックススタイル
const multipleChoiceSx = {
    '& .MuiFormControlLabel-root': { marginRight: '0', flex: '1' },
    '& .MuiFormGroup-root': { minHeight: 'auto', gap: '9px' },
    '& .MuiFormHelperText-root': { display: 'none' },
    '& .MuiFormGroup-row': {display: 'flex',flexDirextion: 'column'},
    '& .MuiFormControlLabel-labelPlacementEnd': {width: 'auto', flex: 'none'},
    '& .MuiButtonBase-root': {padding: '5px 0 9px 9px'},
    width: '100%',
    height: '28px',
    marginBottom: '0',
    ...inputContainer
}

// 汎用フォーム入力コンポーネント
const FormInput= forwardRef<FormInputRefHandle,CustomInputProps> (({
    type = 'text',
    source = '',
    onChange,
    onBlur,
    placeholder = '',
    disabled = false,
    required = false,
    choices = [],
    slotProps = {},
    label = '',
    helperText = '',
    helperTextD = false,
    structure = 'left-right',
    validate,
    readOnly,
    multiline = false,
    sx = {},
    value,
    defaultValue,
    hideDeleteButton,
    format,
    multiple = false,
    ...props
},ref) => {

    const inputRef = useRef(null); 

    const startDateInputRef = useRef(null);
    const endDateInputRef = useRef(null);

    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    })

    useImperativeHandle(ref, () => ({
        focus: () => {
          let el: HTMLElement | null = null;
      
          if (type === 'date-range' || type === 'input-daterange') {
            el = startDateInputRef.current as unknown as HTMLElement;
          } else {
            el = inputRef.current as unknown as HTMLElement;
          }
      
          if (el && 'focus' in el) {
            (el as HTMLInputElement).focus();
          }
        },
        clear: () => {
          if (type === 'input-daterange') {
            (startDateInputRef.current as any)?.clear?.();
            (endDateInputRef.current as any)?.clear?.();
          }
        },
        clearStartDate: () => (startDateInputRef.current as any)?.clear?.(),
        clearEndDate: () => (endDateInputRef.current as any)?.clear?.(),
      }), [type, inputRef, startDateInputRef, endDateInputRef]);

    // 共通の値変更ハンドラ（数値文字列の自動変換 + 非活性時無効）
    const commonHandleComponentChange = useCallback(async (...args: any[]) => {
        if (disabled || readOnly || !onChange) return;
        const value = args[0]?.target?.value ?? args[1] ?? args[0];
        const valueToPass = (type === 'number') && typeof value === 'string' && /^\d+$/.test(value)
            ? Number(value)
            : value;
        await onChange(valueToPass);
    }, [disabled, readOnly, onChange]);

    const dateRangeHandleComponentChange = useCallback(async (latestRange: any) => {
        if (disabled || readOnly || !onChange) return;
        const finalDateRange = latestRange || dateRange;
        await onChange(finalDateRange);
    }, [disabled, readOnly, onChange]);


    // 入力フォーカス喪失ハンドラ
    const handleInputBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (disabled || readOnly || !onBlur) return;
        await onBlur(e.target.value);
    }, [disabled, readOnly, onBlur]);

    // 画像入力変更処理（ファイルオブジェクトをそのまま渡す）
    const handleImageChange = useCallback(async (event: { target: { value: File | null; preview: string | null } }) => {
        if (disabled || readOnly || !onChange) return;
        await onChange(event.target);
    }, [disabled, readOnly, onChange]);

    const inputSlotProps = {
        ...slotProps,
        htmlInput: {
            autoComplete: 'off',
            autoCorrect: 'off',
            autoCapitalize: 'off',
            ...slotProps?.htmlInput
        }
    }

    const textNumberSlotPrors = {
        ...slotProps,
        htmlInput: {   
            autoComplete: 'off',
            autoCorrect: 'off',
            autoCapitalize: 'off',
            onChange: (e: { target: HTMLInputElement | HTMLTextAreaElement; }) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            },
            ...slotProps?.htmlInput
        }
    }

    const halfWidthSlotPrors = {
        ...slotProps,
        htmlInput: {
            id:'halfWidthInput',
            autoComplete: 'off',
            autoCorrect: 'off',
            autoCapitalize: 'off',
            onChange: (e: { target: HTMLInputElement | HTMLTextAreaElement; }) => {
                e.target.value = e.target.value.replace(/[^\x20-\x7E]/g, '');
            },
            ...slotProps?.htmlInput
        }
    }

    const dateInputSlotProp = {
        ...inputSlotProps,
        htmlInput: {
            max:"9999-12-31",
            autoComplete: 'off',
            autoCorrect: 'off',
            autoCapitalize: 'off',
            ...slotProps?.htmlInput
        }
    }


    // 入力コンポーネントのレンダリング（タイプに応じて切り替え）
    const renderInput = () => {
        switch (type) {
            case 'boolean':
                return (
                    <BooleanInput
                        inputRef={inputRef}
                        sx={{ ...inputSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
                        value={value}
                        label=""
                        disabled={disabled}
                        readOnly={readOnly}
                        validate={validate}
                        defaultValue={defaultValue}
                        onChange={commonHandleComponentChange}
                        slotProps={inputSlotProps}
                        format={format}
                    />
                );

            case 'select':
                return (
                    <SelectInput
                        inputRef={inputRef}
                        sx={{ ...selectInputSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
                        value={value}
                        label=""
                        choices={choices}
                        validate={validate}
                        disabled={disabled}
                        readOnly={readOnly}
                        optionValue='key'
                        optionText='value'
                        defaultValue={defaultValue}
                        placeholder={placeholder}
                        onChange={commonHandleComponentChange}
                        slotProps={inputSlotProps}
                        format={format}
                    />
                );

            case 'filter-select':
                return (
                    <AutocompleteInput
                        ref={inputRef}
                        sx={{ ...filterSelectInputSx, ...sx?.input }}
                        source={source}
                        value={value}
                        label=""
                        multiple={multiple}
                        validate={validate}
                        choices={choices}
                        disabled={disabled}
                        readOnly={readOnly}
                        optionValue='key'
                        optionText='value'
                        defaultValue={defaultValue}
                        onChange={commonHandleComponentChange}
                        slotProps={inputSlotProps}
                        noOptionsText='データがありません'
                        format={format}
                    />
                );

            case 'number':
                return (
                    <NumberInput
                    inputRef={inputRef}
                        sx={{ ...inputSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
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
                        slotProps={inputSlotProps}
                        format={format}
                    />
                );

            case 'date':
                return (
                    <DateInput
                    inputRef={inputRef}
                        sx={{ ...dateInputSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
                        value={value}
                        label=""
                        validate={validate}
                        disabled={disabled}
                        readOnly={readOnly}
                        defaultValue={defaultValue}
                        onChange={commonHandleComponentChange}
                        slotProps={dateInputSlotProp}
                        format={format}
                        fullWidth
                    />
                );

            case 'datetime':
                return (
                    <DateTimeInput
                    inputRef={inputRef}
                        sx={{ ...dateInputSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
                        value={value}
                        label=""
                        validate={validate}
                        disabled={disabled}
                        readOnly={readOnly}
                        defaultValue={defaultValue}
                        onChange={commonHandleComponentChange}
                        slotProps={dateInputSlotProp}
                        format={format}
                        fullWidth
                    />
                );

            case 'date-range':
                const startDate = `${source}.startDate`;
                const endDate = `${source}.endDate`;
                return (
                    <div style={attributeLeftRightSx as React.CSSProperties}>
                        <DateInput
                            inputRef={startDateInputRef}
                            sx={{ ...dateInputSx, ...sx?.input }}
                            helperText={helperText ? helperText : false}
                            source={startDate}
                            value={value}
                            label=""
                            validate={validate}
                            disabled={disabled}
                            readOnly={readOnly}
                            defaultValue={defaultValue}
                            onChange={async (...args: any[])=>{
                                const value = args[0]?.target?.value ?? args[1] ?? args[0];
                                const newRange = { ...dateRange, startDate: value };
                                setDateRange(newRange)
                                dateRangeHandleComponentChange(newRange)
                            }}
                            format={format}
                            slotProps={dateInputSlotProp}
                        />
                        <span>~</span>
                        <DateInput
                            inputRef={endDateInputRef}
                            sx={{ ...dateInputSx, ...sx?.input }}
                            helperText={helperText ? helperText : false}
                            source={endDate}
                            value={value}
                            label=""
                            validate={validate}
                            disabled={disabled}
                            readOnly={readOnly}
                            defaultValue={defaultValue}
                            onChange={async (...args: any[])=>{
                                const value = args[0]?.target?.value ?? args[1] ?? args[0];
                                const newRange = { ...dateRange, endDate: value };
                                setDateRange(newRange)
                                dateRangeHandleComponentChange(newRange)
                            }}
                            format={format}
                            slotProps={dateInputSlotProp}
                        />
                    </div>
                );

                case 'datetime-range':
                    const startDateTime = `${source}.startDate`;
                    const endDateTime = `${source}.endDate`;
                    return (
                        <div style={attributeLeftRightSx as React.CSSProperties}>
                            <DateInput
                                inputRef={startDateInputRef}
                                sx={{ ...dateInputSx, ...sx?.input }}
                                helperText={helperText ? helperText : false}
                                source={startDateTime}
                                value={value}
                                label=""
                                validate={validate}
                                disabled={disabled}
                                readOnly={readOnly}
                                defaultValue={defaultValue}
                                onChange={async (...args: any[])=>{
                                    const value = args[0]?.target?.value ?? args[1] ?? args[0];
                                    const newRange = { ...dateRange, startDate: value };
                                    setDateRange(newRange)
                                    dateRangeHandleComponentChange(newRange)
                                }}
                                format={format}
                                slotProps={dateInputSlotProp}
                            />
                            <span>~</span>
                            <DateInput
                                inputRef={endDateInputRef}
                                sx={{ ...dateInputSx, ...sx?.input }}
                                helperText={helperText ? helperText : false}
                                source={endDateTime}
                                value={value}
                                label=""
                                validate={validate}
                                disabled={disabled}
                                readOnly={readOnly}
                                defaultValue={defaultValue}
                                onChange={async (...args: any[])=>{
                                    const value = args[0]?.target?.value ?? args[1] ?? args[0];
                                    const newRange = { ...dateRange, endDate: value };
                                    setDateRange(newRange)
                                    dateRangeHandleComponentChange(newRange)
                                }}
                                format={format}
                                slotProps={dateInputSlotProp}
                            />
                        </div>
                    );

            case 'input-date':
                return (
                    <CustomDateInput
                        ref={inputRef}
                        sx={{ ...dateSelectSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
                        value={value}
                        label=""
                        validate={validate}
                        disabled={disabled}
                        readOnly={readOnly}
                        defaultValue={defaultValue}
                        onBlur={async (...args: any[])=>{
                            const value = args[0]?.target?.value ?? args[1] ?? args[0];
                            commonHandleComponentChange(value)
                        }}
                        slotProps={dateInputSlotProp}
                        dateFormat={format}
                    />
                );

            case 'input-daterange':
                const startInputDate = `${source}.startDate`;
                const endInputDate = `${source}.endDate`;
                return (
                    <div style={attributeLeftRightSx as React.CSSProperties}>
                        <CustomDateInput
                            ref={startDateInputRef}
                            sx={{ ...dateSelectSx, ...sx?.input }}
                            helperText={helperText ? helperText : false}
                            source={startInputDate}
                            value={value}
                            label=""
                            validate={validate}
                            disabled={disabled}
                            readOnly={readOnly}
                            defaultValue={defaultValue}
                            onBlur={async (...args: any[])=>{
                                const value = args[0]?.target?.value ?? args[1] ?? args[0];
                                const newRange = { ...dateRange, startDate: value };
                                setDateRange(newRange)
                                dateRangeHandleComponentChange(newRange)
                            }}
                            slotProps={dateInputSlotProp}
                            dateFormat={format}
                        />
                        <span>~</span>
                        <CustomDateInput
                            ref={endDateInputRef}
                            sx={{ ...dateSelectSx, ...sx?.input }}
                            helperText={helperText ? helperText : false}
                            source={endInputDate}
                            value={value}
                            label=""
                            validate={validate}
                            disabled={disabled}
                            readOnly={readOnly}
                            defaultValue={defaultValue}
                            onBlur={async (...args: any[])=>{
                                const value = args[0]?.target?.value ?? args[1] ?? args[0];
                                const newRange = { ...dateRange, endDate: value };
                                setDateRange(newRange)
                                dateRangeHandleComponentChange(newRange)
                            }}
                            slotProps={dateInputSlotProp}
                            dateFormat={format}
                        />
                    </div>
                );

            case 'password':
                return (
                    <PasswordInput
                    inputRef={inputRef}
                        sx={{ ...inputSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
                        value={value}
                        label=""
                        validate={validate}
                        disabled={disabled}
                        readOnly={readOnly}
                        defaultValue={defaultValue}
                        placeholder={placeholder}
                        onChange={commonHandleComponentChange}
                        onBlur={handleInputBlur}
                        slotProps={inputSlotProps}
                        format={format}
                    />
                );

            case 'radio':
                return (
                    <RadioButtonGroupInput
                        sx={{ ...radioSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
                        value={value}
                        label=""
                        choices={choices}
                        optionText="value"
                        optionValue="key"
                        validate={validate}
                        disabled={disabled}
                        readOnly={readOnly}
                        defaultValue={defaultValue}
                        onChange={commonHandleComponentChange}
                        format={format}
                    />
                );

            case 'multiple-choice':
                return (
                    <CheckboxGroupInput
                    inputRef={inputRef}
                        sx={{ ...multipleChoiceSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
                        value={value}
                        label=""
                        choices={choices}
                        optionText="value"
                        optionValue="key"
                        validate={validate}
                        disabled={disabled}
                        readOnly={readOnly}
                        defaultValue={defaultValue}
                        onChange={commonHandleComponentChange}
                        format={format}
                    />
                );

            case 'text':
                return (
                    <TextInput
                    inputRef={inputRef}
                        sx={{ ...inputSx, ...sx?.input }}
                        helperText={helperText ? helperText : false}
                        source={source}
                        label=""
                        validate={validate}
                        disabled={disabled}
                        multiline={multiline}
                        readOnly={readOnly}
                        defaultValue={defaultValue}
                        placeholder={placeholder}
                        onChange={commonHandleComponentChange}
                        onBlur={handleInputBlur}
                        slotProps={inputSlotProps}
                        format={format}
                    />
                );

                case 'text-number':
                    return (
                        <TextInput
                        inputRef={inputRef}
                            sx={{ ...inputSx, ...sx?.input }}
                            helperText={helperText ? helperText : false}
                            source={source}
                            label=""
                            validate={validate}
                            disabled={disabled}
                            multiline={multiline}
                            readOnly={readOnly}
                            defaultValue={defaultValue}
                            placeholder={placeholder}
                            onChange={commonHandleComponentChange}
                            onBlur={handleInputBlur}
                            slotProps={textNumberSlotPrors}
                            format={format}
                        />
                    );
                
                case 'text-halfwidth':
                    return (
                        <>
                        <TextInput
                        inputRef={inputRef}
                            sx={{ ...inputSx, ...sx?.input }}
                            helperText={helperText ? helperText : false}
                            source={source}
                            label=""
                            validate={validate}
                            disabled={disabled}
                            multiline={multiline}
                            readOnly={readOnly}
                            defaultValue={defaultValue}
                            placeholder={placeholder}
                            onChange={commonHandleComponentChange}
                            onBlur={handleInputBlur}
                            slotProps={halfWidthSlotPrors}
                            format={format}
                        />
                        {helperTextD ? <div style={{ fontSize: '12px', color: '#F00102' }}>※半角で入力してください</div> : ''}
                        </>
                    );

                case 'image': // 画像アップロード
                return (
                    <CustomImageInput
                        value={value}
                        onChange={handleImageChange}
                        error={!!(validate && validate.length && value === undefined)}
                        disabled={disabled || readOnly}
                        required={required}
                        helperText={helperText}
                        sx={sx?.input || {}}
                        fullWidth
                        hideDeleteButton={hideDeleteButton}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div style={structure === 'left-right' ? { ...attributeLeftRightSx, ...sx } as React.CSSProperties : { ...attributeTopBottomSx, ...sx } as React.CSSProperties}>
            {/* ラベル表示（必須マーク付き） */}
            {label && (
                <div
                    style={{
                        ...(structure === 'left-right' ? labelLeftRightSx : labelTopBottomSx),
                        ...sx?.label
                    }}
                >
                    <label>{label}</label>
                    {required && (
                        <div
                            style={{
                                backgroundColor: '#F00001',
                                padding: '0 2px',
                                fontSize: '10px',
                                fontWeight: '600',
                                marginLeft: '1rem',
                                color: 'white',
                                height: '15px'
                            }}
                        >必須</div>
                    )}
                </div>
            )}
            {/* 入力コンポーネント */}
            {renderInput()}
        </div>
    );
});

export default FormInput;