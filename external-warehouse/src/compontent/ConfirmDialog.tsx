import React, { useCallback, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { WarningAmber } from '@mui/icons-material';

import CustomModal from './CustomModal';

/** 確認ダイアログのボタン色 */
type ConfirmColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

/** 確認ダイアログの表示内容 */
export interface ConfirmDialogOptions {
    /** ダイアログのタイトル */
    title?: string;
    /** 確認内容 */
    message: React.ReactNode;
    /** 補足説明 */
    description?: React.ReactNode;
    /** 実行ボタンの文言 */
    confirmLabel?: string;
    /** キャンセルボタンの文言 */
    cancelLabel?: string;
    /** 実行ボタンの色 */
    confirmColor?: ConfirmColor;
}

/** 確認ダイアログ本体のプロパティ */
interface ConfirmDialogProps extends ConfirmDialogOptions {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * 共通の確認ダイアログ。
 * 実行・キャンセルの 2 択を表示し、業務処理の前に確認を求める。
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    message,
    description,
    confirmLabel,
    cancelLabel,
    confirmColor,
    onConfirm,
    onCancel,
}) => (
    <CustomModal
        open={open}
        title={title || '確認'}
        onClose={onCancel}
        maxWidth="xs"
        backdropClose={false}
        actions={[
            {
                label: cancelLabel || 'キャンセル',
                onClick: onCancel,
                variant: 'outlined',
                color: 'primary',
                keepOpen: true,
            },
            {
                label: confirmLabel || 'OK',
                onClick: onConfirm,
                variant: 'contained',
                color: confirmColor || 'primary',
                keepOpen: true,
            },
        ]}
    >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '8px 4px' }}>
            <WarningAmber sx={{ color: '#f0a400', fontSize: 40, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#333333', lineHeight: 1.7 }}>
                    {message}
                </Typography>
                {description ? (
                    <Typography sx={{ marginTop: '8px', fontSize: '14px', color: '#666666', lineHeight: 1.7 }}>
                        {description}
                    </Typography>
                ) : null}
            </Box>
        </Box>
    </CustomModal>
);

/** useConfirmDialog が保持する確認待ちの内容 */
interface ConfirmState {
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
}

/**
 * 共通確認ダイアログを Promise として扱うフック。
 * 画面側で `{confirmDialog}` を描画し、`await confirm({...})` の結果で処理を分岐する。
 */
export const useConfirmDialog = () => {
    const [state, setState] = useState<ConfirmState | null>(null);

    /** 確認ダイアログを開き、選択結果を返す */
    const confirm = useCallback(
        (options: ConfirmDialogOptions) =>
            new Promise<boolean>((resolve) => setState({ options, resolve })),
        []
    );

    /** 選択結果を通知してダイアログを閉じる */
    const handleResult = useCallback(
        (result: boolean) => {
            if (!state) {
                return;
            }
            state.resolve(result);
            setState(null);
        },
        [state]
    );

    const confirmDialog = (
        <ConfirmDialog
            open={state !== null}
            title={state?.options.title}
            message={state?.options.message}
            description={state?.options.description}
            confirmLabel={state?.options.confirmLabel}
            cancelLabel={state?.options.cancelLabel}
            confirmColor={state?.options.confirmColor}
            onConfirm={() => handleResult(true)}
            onCancel={() => handleResult(false)}
        />
    );

    return { confirm, confirmDialog };
};

export default ConfirmDialog;
