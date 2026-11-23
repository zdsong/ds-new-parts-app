import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { spSx } from '../styles/spSx';

/**
 * 製品・部品選択画面（SP301）
 *
 * 設計書：①パレット番号管理 3.1 製品・部品選択
 *   パレットに積載する対象（製品／部品）を最初に選ぶ。
 *   選択した区分は品目検索（SP302）へ引き継ぐ。
 *   区分は DB の区分コードに合わせて 1:製品 / 3:部品 とする。
 */
const SP301: React.FC = () => {
    const navigate = useNavigate();

    /** 区分（1:製品 / 3:部品）を決めて品目検索へ遷移する */
    const handleSelect = (category: string) => {
        navigate('/SP302', { state: { category } });
    };

    return (
        <Box sx={spSx.page}>
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>製品・部品選択</label>
            </Box>

            <Typography sx={{ fontSize: '14px', color: '#212121', lineHeight: 1.6, margin: '12px 0 4px' }}>
                移行するものを選択してください
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <button
                    type="button"
                    style={spSx.choiceButton}
                    onClick={() => handleSelect('1')}
                >
                    製品
                </button>
                <button
                    type="button"
                    style={spSx.choiceButton}
                    onClick={() => handleSelect('3')}
                >
                    部品
                </button>
            </Box>
        </Box>
    );
};

export default SP301;
