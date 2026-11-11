import React from 'react';
import {
    CardContent,
    CardHeader,
    Typography,
    Box,
} from '@mui/material';

import returnIcon from '../assets/icons/return-icon.png';
import { PageHeaderContainer, pageContentContainer, pageContainer } from '../styles/cardSx';
import { useNavigate } from 'react-router';
import { tableSx } from '../styles/commonSX';

interface CustomCardProps {
    title?: string | React.ReactNode;
    returnButton?: boolean;
    children?: React.ReactNode;
    subheader?: string;
    avatar?: React.ReactNode;
    action?: React.ReactNode;
    titleProps?: object;
    contentProps?: object;
    cardProps?: object;
    titleVariant?:
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'subtitle1' | 'subtitle2'
    | 'body1' | 'body2'
    | 'caption' | 'overline'
    | 'inherit';
    divider?: boolean;
    sx?: object;
}

// ページ全体をラップするコンテナコンポーネント 
const PageContainer: React.FC<CustomCardProps> = ({
    title,
    returnButton = false,
    children,
    subheader,
    avatar,
    action,
    titleProps = {},
    contentProps = {},
    cardProps = {},
    titleVariant = 'h6',
    divider = true,
    ...rest
}) => {
    // ルーティングナビゲーションフック
    const navigate = useNavigate();

    // タイトルレンダリング処理（文字列/React要素に対応）
    const renderTitle = () => {
        if (typeof title === 'string') {
            return (
                <Typography sx={{}}
                    variant={titleVariant as any}
                    component="h2"
                >
                    {title}
                </Typography>
                
            );
        }
        return title;
    };

    return (
        <Box
            sx={{
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                ...pageContainer,
                ...rest?.sx,
            }}
            {...cardProps}
        >
            {/* ヘッダー領域（タイトル/サブヘッダー/アバター/アクションが存在する場合） */}
            {(title || subheader || avatar || action) && (
                <Box
                    sx={{
                        height: '100%',
                        // display: 'flex',
                        flexDirection: 'row',
                    }}
                >
                    {/* 戻るボタン（フラグがtrueの場合表示） */}
                    {returnButton ? (
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '2px', marginRight: '10px' }} onClick={() => { navigate(-1) }}>
                            <img src={returnIcon} alt="messageIcon" style={{ height: '30px' }} />
                            <div style={tableSx.linkFontColumn}>戻る</div>
                        </div>
                    ) : ''}
                    {/* カードヘッダー（タイトル領域） */}
                    <CardHeader
                        title={renderTitle()}
                        subheader={subheader}
                        avatar={avatar}
                        action={action}
                        sx={{
                            flex: 1,
                            ...PageHeaderContainer,
                            ...(titleProps as any)?.sx,
                        }}
                        {...titleProps}
                    />

                </Box>
            )}

            {/* ページコンテンツ領域 */}
            <CardContent
                sx={pageContentContainer}
                {...contentProps}
            >
                {children}
            </CardContent>
        </Box>
    );
};

export default PageContainer;