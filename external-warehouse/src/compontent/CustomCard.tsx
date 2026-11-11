import React, { useState } from 'react';
import { CardHeader, Typography, Box } from '@mui/material';
import { cardContainer, cardHeaderContainer, cardContentContainer } from '../styles/cardSx';

// カスタムカードコンポーネントのプロパティ型定義
interface CustomCardProps {
    title?: string | React.ReactNode;
    children?: React.ReactNode;
    subheader?: string;
    drawer?: boolean;
    avatar?: React.ReactNode;
    action?: React.ReactNode;
    titleProps?: object;
    contentProps?: object;
    cardProps?: object;
    titleVariant?: 
        | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
        | 'subtitle1' | 'subtitle2'
        | 'body1' | 'body2' | 'page'
        | 'caption' | 'overline'
        | 'inherit';
    divider?: boolean;
    border?: boolean;
    sx?: object;
}

// カスタムカードコンポーネント（ドロワー機能付き）
const CustomCard: React.FC<CustomCardProps> = ({
    title,
    children,
    subheader,
    avatar,
    action,
    titleProps = {},
    contentProps = {},
    cardProps = {},
    titleVariant = 'h6',
    drawer = false,
    divider = true, 
    border = true,
    sx,
    ...rest 
}) => { 
    // カードコンテンツの表示/非表示フラグ
    const [showFlag, setShowFlag] = useState(true);
    
    // ドロワーの表示状態切り替えハンドラ
    const drawerStatusChange = () => {
        setShowFlag(!showFlag);
    };

    // タイトル要素のレンダリング処理
    const renderTitle = () => { 
        if (typeof title === 'string') { 
            return (
                <Typography
                    variant={titleVariant as any}
                    component="h2" 
                >
                    {'▸ ' + title}
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
                ...cardContainer,
            }}
            {...cardProps}
        >
            {/* ヘッダー要素（タイトル/サブヘッダー/アバター/アクションが存在する場合に表示） */}
            {(title || subheader || avatar || action) && (
                <CardHeader 
                    title={renderTitle()}
                    subheader={subheader}
                    avatar={avatar}
                    action={action}
                    sx={{
                        ...cardHeaderContainer,
                        ...(titleProps as any)?.sx,
                    }}
                    {...titleProps}
                    onClick={() => {
                        drawer ? drawerStatusChange() : '';
                    }}
                />
            )}
            
            {/* コンテンツ領域（showFlagがtrueの場合に表示） */}
            {showFlag && (
                <Box 
                    sx={{
                        ...cardContentContainer,
                        border: border ? '1px solid #d0d0d0' : 0,
                        padding: border ? cardContentContainer.padding : 0
                    }}
                >
                    {children}
                </Box>
            )}
        </Box>
    );
};

export default CustomCard;