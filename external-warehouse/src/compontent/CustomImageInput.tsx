import React, { useState, useEffect, useRef } from 'react';
import {
    Button,
    Box,
    Avatar,
    IconButton,
    Modal,
    Fade
} from '@mui/material';
// @ts-ignore
import { Delete, AddPhotoAlternate, Close } from '@mui/icons-material';
import { imageUploaderStyles } from '../styles/inputSx';

// カスタム画像入力コンポーネントのプロパティ型定義
interface CustomImageInputProps {
    value?: {
        preview?: string;
        file?: File | null;
    };
    onChange?: (event: { target: { value: File | null; preview: string | null } }) => void;
    error?: boolean;
    disabled?: boolean;
    required?: boolean;
    fullWidth?: boolean;
    sx?: object;
    helperText?: string;
    hideDeleteButton?: boolean;
}

// カスタム画像アップロードコンポーネント（プレビュー/削除機能付き）
const CustomImageInput: React.FC<CustomImageInputProps> = ({
    value,
    onChange,
    error = false,
    disabled = false,
    required = false,
    fullWidth = true,
    sx = {},
    helperText,
    hideDeleteButton = false
}) => {
    // 画像プレビューURL
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    // プレビューモーダルの表示状態
    const [previewOpen, setPreviewOpen] = useState(false);
    // ファイル入力要素の参照
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 外部からのvalue変更を監視し、プレビューURLを更新
    useEffect(() => {
        if (value?.preview) {
            setPreviewUrl(value.preview);
        } else if (!value) {
            setPreviewUrl(null);
        }
    }, [value]);

    // ファイル選択ボタンクリック時：非表示のファイル入力要素をトリガー
    const handleFileButtonClick = () => {
        fileInputRef.current?.click();
    };

    // ファイル選択時の処理：プレビュー生成と親コンポーネントへの値通知
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setPreviewUrl(result);
                
                if (onChange) {
                    onChange({
                        target: {
                            value: file,
                            preview: result
                        }
                    });
                }
            };
            
            reader.readAsDataURL(file);
        }
    };

    // 画像削除処理：プレビュークリアと親コンポーネントへの値通知
    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviewUrl(null);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        
        if (onChange) {
            onChange({
                target: {
                    value: null,
                    preview: null
                }
            });
        }
    };

    // プレビューモーダルを開く処理
    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (previewUrl) {
            setPreviewOpen(true);
        }
    };

    // プレビューモーダルを閉じる処理
    const handleClosePreview = () => {
        setPreviewOpen(false);
    };

    return (
        <Box sx={{ ...imageUploaderStyles.root, ...sx }}>
            <Button
                variant="outlined"
                disabled={disabled}
                onClick={handleFileButtonClick}
                sx={imageUploaderStyles.button}
            >
                {previewUrl ? (
                    <Avatar
                        src={previewUrl}
                        sx={imageUploaderStyles.avatar}
                        onClick={handleImageClick}
                    />
                ) : (
                    <Box sx={imageUploaderStyles.placeholderContainer}>
                        <AddPhotoAlternate />
                        <span style={{ fontSize: '12px' }}>画像をアップロード</span>
                    </Box>
                )}
            </Button>
            
            {/* 画像が選択されている場合、削除ボタンを表示 */}
            {previewUrl && !hideDeleteButton && (
                <IconButton
                    size="small"
                    onClick={handleRemoveImage}
                    sx={imageUploaderStyles.deleteButton}
                >
                    <Delete fontSize="small" />
                </IconButton>
            )}
            
            {/* 非表示のファイル入力要素 */}
            <input 
                ref={fileInputRef}
                type="file"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                accept="image/*"
                required={required}
            />

            {/* 画像プレビューモーダル */}
            <Modal
                open={previewOpen}
                onClose={handleClosePreview}
                sx={imageUploaderStyles.modal}
            >
                <Fade in={previewOpen}>
                    <Box sx={imageUploaderStyles.modalContent}>
                        <IconButton
                            onClick={handleClosePreview}
                            sx={imageUploaderStyles.modalCloseButton}
                        >
                            <Close />
                        </IconButton>
                        <img 
                            src={previewUrl || ''} 
                            alt="画像のプレビュー"
                            style={imageUploaderStyles.previewImage}
                        />
                    </Box>
                </Fade>
            </Modal>
        </Box>
    );
};

export default CustomImageInput;