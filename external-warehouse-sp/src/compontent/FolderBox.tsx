import React, { useState, useRef, useEffect } from 'react';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';

interface CustomCardProps {
    children?: React.ReactNode;
    folderHeight: string;
    sx?: object;
}

// 検索機能付きカードコンポーネント
const FolderBox: React.FC<CustomCardProps> = ({
    children,
    folderHeight,
    sx,
}) => { 
    // コンテンツ表示/非表示フラグ
    const [showFlag, setShowFlag] = useState(false);
    const [showArrow, setShowArrow] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    
    // ドロワー表示状態切り替え
    const drawerStatusChange = () => {
        setShowFlag(!showFlag);
    };

    const calcContentHeight = () => {
        if (!contentRef.current) return;
        const actualContentHeight = contentRef.current.scrollHeight;
        const limitHeight = Number(folderHeight.replace(/px/g, ''));
        setShowArrow(actualContentHeight > limitHeight);
    };

    useEffect(() => {
        calcContentHeight();
    }, [children, folderHeight]);

    return (
        <div
            style={{
                width: '100%',
                ...(sx as React.CSSProperties),
            }}
        >   
            <div
                ref={contentRef}
                style={{
                    height: !showArrow ? 'auto' : (showFlag ? 'auto' : folderHeight),
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    width: '100%',
                }}
            >
                {children}
            </div>

            {showArrow && (
                <div 
                    onClick={drawerStatusChange} 
                    style={{
                        borderTop: '1px solid #ccc', 
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '4px 0',
                    }}
                >
                    {showFlag ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </div>
            )}
        </div>
    );
};

export default FolderBox;