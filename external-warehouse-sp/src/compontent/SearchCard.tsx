import React, { useState } from 'react';
import {
    CardHeader,
    Typography,
    Box,
} from '@mui/material';
import searchIcon from '../assets/icons/search-icon.png';

import { cardContainer, cardHeaderContainer, cardContentContainer} from '../styles/cardSx'

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

// 検索機能付きカードコンポーネント
const SearchCard: React.FC<CustomCardProps> = ({
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
    // コンテンツ表示/非表示フラグ
    const [showFlag, setShowFlag] = useState(true);
    
    // ドロワー表示状態切り替え
    const drawerStatusChange = () => {
        setShowFlag(!showFlag)
    }
    
    // タイトルレンダリング処理（文字列の場合は検索アイコン付きで表示）
    const renderTitle = () => { 
        if (typeof title === 'string') { 
            return (
                <Typography sx = {{display: 'flex'}}
                    variant={titleVariant as any}
                    component="h2" 
                >
                    <img 
                        src={searchIcon} 
                        alt="searchIcon" 
                        style={{ height: '20px', marginRight: '3px'}}
                    />
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
                ...cardContainer,
                ...sx
            }}
            {...cardProps}
        >
            {/* カードヘッダー（タイトル/サブヘッダー等が存在する場合表示） */}
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
                    onClick={()=>{
                        drawer? drawerStatusChange(): ''
                    }}
                />
            )}
            
            {/* カードコンテンツ（showFlagがtrueの場合表示） */}
            {showFlag?
            <Box 
                sx={{
                    ...cardContentContainer,
                }}
            >
                {children}
            </Box>:''}
            
        </Box>
    );
};

export default SearchCard;