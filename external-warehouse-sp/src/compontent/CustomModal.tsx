import React, { ReactNode } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Typography,
    Box,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { Close, Cancel } from '@mui/icons-material';

import { modalStyles } from '../styles/modalSx'

// モーダルアクションボタン型定義 
interface ModalAction {
    label: string;
    onClick: () => void;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    variant?: 'text' | 'outlined' | 'contained';
    icon?: ReactNode;
    disabled?: boolean;
    keepOpen?: boolean;
    sx?: object;
}

// カスタムモーダルプロップス型定義
interface CustomModalProps {
    open?: boolean;
    onClose?: () => void;
    title?: string;
    children?: ReactNode | ((props: { onClose: () => void; onConfirm: () => void }) => ReactNode);
    actions?: ModalAction[];
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    fullScreen?: boolean;
    showCloseButton?: boolean;
    backdropClose?: boolean;
    dividers?: boolean;
    loading?: boolean;
    onConfirm?: () => void;
    contentProps?: object;
    titleProps?: object;
    actionsProps?: object;
    sx?: any;
}

// ボタンカラー型定義
type ButtonColor = 'inherit' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

// カスタムモーダルコンポーネント
const CustomModal: React.FC<CustomModalProps> = ({
    open = false,
    onClose = () => {},
    title = '',
    children = null,
    actions = [],
    maxWidth = 'md',
    fullScreen = false,
    showCloseButton = false,
    backdropClose = true,
    dividers = false,
    loading = false,
    onConfirm = () => {},
    contentProps = {},
    titleProps = {},
    actionsProps = {},
    sx = {}
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // 背景クリック時の処理（バックドロップクローズ有効時）
    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (backdropClose && event.target === event.currentTarget) {
            onClose();
        }
    };

    // 確定処理（閉じるを同時に実行）
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    // アクションボタンクリック処理
    const handleActionClick = (action: ModalAction) => {
        action.onClick();
        if (!action.keepOpen) {
            onClose();
        }
    };

    // ボタンカラーのバリデーション
    const getButtonColor = (color: string | undefined): ButtonColor => {
        if (!color) return 'primary';
        const validColors: ButtonColor[] = ['inherit', 'primary', 'secondary', 'error', 'warning', 'info', 'success'];
        return validColors.includes(color as ButtonColor) ? color as ButtonColor : 'primary';
    };

    // デフォルトアクションボタン（キャンセル）
    const defaultActions: ModalAction[] = [
        {
            label: 'キャンセル',
            onClick: onClose,
            color: 'primary',
            variant: 'outlined',
            icon: <Cancel />
        },
    ];

    // 表示するアクションボタンの決定
    const displayActions = actions.length > 0 ?  actions : showCloseButton? defaultActions : [];

    // 子要素のレンダリング処理（関数型/要素型対応）
    const renderChildren = () => {
        if (children === null || children === undefined) {
            return ( 
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                    しばらく内容がない 
                    </Typography>
                </Box>
            );
        }

        if (typeof children === 'function') {
            const functionChildren = children as (props: { onClose: () => void; onConfirm: () => void }) => ReactNode;
            return functionChildren({ onClose, onConfirm });
        }

        return children;
    };

    return (
        <Dialog 
            open={open}
            onClose={handleBackdropClick}
            maxWidth={maxWidth}
            fullWidth
            fullScreen={fullScreen || isMobile}
            slotProps={{
                paper: {
                    sx: {
                        height: 'auto',
                        maxHeight: isMobile ? '90%' : '90%',
                        minHeight: isMobile ? '30%' : '30%',
                        maxWidth: isMobile ? '90%' : '90%',
                        touchAction: 'manipulation',
                    }
                }
            }}
            sx={{
                '& input, & textarea, & select': {
                    fontSize: '16px !important',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                },
                '& *': {
                    touchAction: 'manipulation',
                }
            }}
        >
            {/* モーダルタイトル */}
            <DialogTitle 
                sx={{
                    ...modalStyles.modalTitle,
                    ...(dividers && { borderBottom: '1px solid var(--divider-color)' })
                }}
                {...titleProps}
            >
                <div style={{width: '100%', display: 'flex', justifyContent: 'end'}}>
                <IconButton
                    sx={modalStyles.modalCloseButton}
                    onClick={onClose}
                >
                    <Close />
                </IconButton>
                </div>
                <div style = {{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    }}>
                    <label style = {{color: 'black', fontSize: '22px',fontWeight: '600',}}>
                        {title}
                    </label>
                </div>
            </DialogTitle>

            {/* モーダルコンテンツ */}
            <DialogContent 
                sx={{
                    ...modalStyles.modalContent,
                    ...(dividers && { borderBottom: '1px solid var(--divider-color)' }),
                    ...sx
                }}
                {...contentProps}
            >
                <Box 
                    sx={{
                        ...modalStyles.modalContainer,
                        ...modalStyles.modalContentInner,
                        height: '100%',
                        display: 'flex',
                        // flex: 1,
                        flexDirection: 'column',
                    }}
                >
                    
                    {renderChildren()}
                </Box>
            </DialogContent>

            {/* アクションボタン領域 */}
            {displayActions.length > 0 && (
                <DialogActions 
                    sx={modalStyles.modalActions}
                    {...actionsProps}
                >
                    {displayActions.map((action, index) => (
                        <Button
                            key={index}
                            onClick={() => handleActionClick(action)}
                            variant={action.variant || 'contained'}
                            color={getButtonColor(action.color)}
                            disabled={loading || action.disabled}
                            startIcon={action.icon}
                            sx={{
                                ...modalStyles.modalActionButton,
                                ...action.sx
                            }}
                        >
                            {action.label}
                        </Button>
                    ))}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default CustomModal;