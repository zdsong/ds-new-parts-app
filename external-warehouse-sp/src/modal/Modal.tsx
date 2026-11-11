import React, { ReactNode } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography,
    Box,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface ModalAction {
    label: string;
    onClick: () => void;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'default';
    variant?: 'text' | 'outlined' | 'contained';
    icon?: ReactNode;
    disabled?: boolean;
    keepOpen?: boolean;
    sx?: object;
}

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
    paperProps?: object;
    contentProps?: object;
    titleProps?: object;
    actionsProps?: object;
}

const CustomModal: React.FC<CustomModalProps> = ({
    open = false,
    onClose = () => {},
    title = '',
    children = null,
    actions = [],
    maxWidth = 'md',
    fullScreen = false,
    showCloseButton = true,
    backdropClose = true,
    dividers = false,
    loading = false,
    onConfirm = () => {},
    paperProps = {},
    contentProps = {},
    titleProps = {},
    actionsProps = {}
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (backdropClose && event.target === event.currentTarget) {
            onClose();
        }
    };

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
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: dividers ? `1px solid ${theme.palette.divider}` : 'none',
                    backgroundColor: theme.palette.background.default,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    ...(titleProps as any)?.sx
                }}
                {...titleProps}
            >
                <Box sx={{ fontWeight: 600 }}>
                    {title}
                </Box>
                {showCloseButton && (
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: theme.palette.text.secondary,
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                                color: theme.palette.text.primary
                            }
                        }}
                    >
                        <Close />
                    </IconButton>
                )}
            </DialogTitle>

            <DialogContent
                sx={{
                    padding: '24px',
                    ...(dividers && {
                        borderBottom: `1px solid ${theme.palette.divider}`
                    }),
                    ...(contentProps as any)?.sx
                }}
                {...contentProps}
            >
                <Box 
                    sx={{ 
                        minHeight: '100px',
                        overflow: 'auto',
                        maxHeight: isMobile ? 'calc(100vh - 200px)' : 'calc(90vh - 200px)'
                    }}
                >
                    {renderChildren()}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default CustomModal;