import React from 'react';
import { Box } from '@mui/material';

import logoIcon from '../assets/icons/D.png';

/**
 * 初期表示画面（P001）
 *
 * ログイン後に表示するホーム画面。ロゴとシステム名だけを画面中央に置く。
 * PC／SP のどちらでも同じレイアウトになるよう、寸法は clamp() で
 * ビューポート幅に応じて伸縮させる（画面ごとの分岐は不要）。
 */
const p001Sx = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(18px, 3vw, 32px)',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        boxSizing: 'border-box' as const,
        // 端末幅が狭いときは余白を詰める（ロゴと文字が折り返さない幅を確保する）
        padding: 'clamp(20px, 6vw, 48px)',
    },
    /**
     * ロゴ（青い楕円に白の D）
     * 原本は正方形の画像なので、参考デザインの楕円比率（横 : 縦 ≒ 1.39 : 1）に
     * 合わせて横方向だけ引き伸ばす。
     */
    logo: {
        display: 'block',
        width: 'clamp(120px, 26vw, 220px)',
        height: 'auto',
        aspectRatio: '1.39',
        objectFit: 'fill' as const,
        userSelect: 'none' as const,
        pointerEvents: 'none' as const,
    },
    /** システム名（ロゴの下に 1 行で置く） */
    title: {
        color: '#1a1a1a',
        // 17 文字（全角）が 1 行に収まる上限として 4.6vw を使う
        // （左右の余白を含めても 100vw を超えない）
        fontSize: 'clamp(14px, 4.6vw, 40px)',
        fontWeight: 700,
        lineHeight: 1.4,
        letterSpacing: '0.01em',
        textAlign: 'center' as const,
        whiteSpace: 'nowrap' as const,
    },
} as const;

const P001: React.FC = () => (
    <Box sx={p001Sx.page}>
        <Box component="img" src={logoIcon} alt="新部品管理システム" sx={p001Sx.logo} />
        <Box component="div" sx={p001Sx.title}>
            新部品管理システム
        </Box>
    </Box>
);

export default P001;
