import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import LoginLogoIcon from '../assets/icons/D.png';
import { buttonSx } from '../styles/commonSX';
import { applyThemeVars, resolveInitialTheme } from '../styles/themeVars';

/**
 * ログイン画面（N001〜N004）共通の外枠レイアウト
 *
 * 画面幅に応じて寸法を連続的に変化させる（clamp による線形補間）。
 *   計算式：clamp(最小値, calc(A + B vw), 最大値)
 *   ・390px（スマートフォン）で最小値＝ew-sp 相当の見た目
 *   ・1200px 以上で最大値＝PC の見た目（従来値）
 *   A = 最小値 - 0.4815 * (最大値 - 最小値) ／ B = (最大値 - 最小値) / 8.1
 *
 * これにより、PC 幅では従来どおりの固定レイアウトのまま、狭くなるほど
 * 余白・ロゴ・文字・入力欄・ボタンが少しずつ縮み、最終的に sp の見た目に収束する。
 * 途中で切り替わる段差（メディアクエリによる分岐）は設けていない。
 */
export const FLUID = {
    // 外側余白：左右 8px → 100px、上下 24px → 100px
    paddingX: 'clamp(8px, calc(-36.3px + 11.36vw), 100px)',
    paddingY: 'clamp(24px, calc(-12.6px + 9.38vw), 100px)',
    // ロゴ：100 x 80px → 150 x 120px
    logoWidth: 'clamp(100px, calc(43.3px + 8.89vw), 150px)',
    logoHeight: 'clamp(80px, calc(34.1px + 7.16vw), 120px)',
    // タイトル文字：20px → 34px
    titleFont: 'clamp(20px, calc(13.3px + 1.73vw), 34px)',
    // 説明文：12px → 15px、上余白 16px → 30px
    subtitleFont: 'clamp(12px, calc(10.6px + 0.37vw), 15px)',
    subtitleMarginTop: 'clamp(16px, calc(9.3px + 1.73vw), 30px)',
    // 入力欄の高さ・文字：44px / 14px → 50px / 16px
    inputHeight: 'clamp(44px, calc(41.1px + 0.74vw), 50px)',
    inputFont: 'clamp(14px, calc(13px + 0.25vw), 16px)',
    // 入力欄の間隔：16px → 32px
    fieldGap: 'clamp(16px, calc(8.3px + 1.98vw), 32px)',
    // 入力欄・フォームの横幅：320px → 600px（PC では 600px で頭打ち）
    // ※ 画面幅が 320px を切る端末でもはみ出さないよう、適用側で maxWidth: 100% を併用する
    formWidth: 'clamp(320px, calc(185.2px + 34.57vw), 600px)',
    // ボタン群の上余白：32px → 50px
    actionMarginTop: 'clamp(32px, calc(23.3px + 2.22vw), 50px)',
    // ボタン：高さ 40px → 50px、文字 17px → 20px、幅 320px → 400px
    // （スマートフォンでは入力欄と同じ幅 320px に揃える）
    buttonHeight: 'clamp(40px, calc(35.2px + 1.24vw), 50px)',
    buttonFont: 'clamp(17px, calc(15.6px + 0.37vw), 20px)',
    buttonMaxWidth: 'clamp(320px, calc(281.5px + 9.88vw), 400px)',
    // タイトルとフォームの間隔：24px → 44px
    formMarginTop: 'clamp(24px, calc(14.4px + 2.47vw), 44px)',
    // フッター文字：12px → 15px
    footerFont: 'clamp(12px, calc(10.6px + 0.37vw), 15px)',
};

// 入力欄の寸法だけ画面幅に追従させる（余白・角丸などは LabelInput 既定を踏襲）
export const fluidInputSx = {
    input: {
        '& .MuiInputBase-root': {
            height: FLUID.inputHeight,
            padding: 'clamp(6px, 1.1vw, 10px)',
            borderRadius: '5px',
            border: 0,
        },
        '& .MuiInputBase-input': {
            fontSize: FLUID.inputFont,
            paddingTop: '0px',
            paddingBottom: '0px',
            paddingLeft: '5px',
        },
    },
};

// ログインボタン：幅・高さ・文字を画面幅に追従させる（PC 幅では従来の 400 x 50）
export const fluidLoginButtonSx = {
    ...buttonSx.loginButton,
    width: '100%',
    maxWidth: FLUID.buttonMaxWidth,
    height: FLUID.buttonHeight,
    fontSize: FLUID.buttonFont,
};

interface LoginShellProps {
    /** タイトル直下の説明文（N002〜N004 で使用） */
    subtitle?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * ロゴ → タイトル →（説明文）→ フォーム → 余白 → フッター（画面下端）
 * の順で縦に並べる。フォームの幅は外枠側で管理するため、子要素は
 * 幅 100% のブロック（SimpleForm など）をそのまま渡す。
 */
const LoginShell: React.FC<LoginShellProps> = ({ subtitle, children }) => {
    // ログイン画面には AppBar（ThemeToggel）が無いため、テーマ色の CSS 変数が未定義になる。
    // その状態では var(--mui-page-header-color) を使うボタン背景が無効になり、
    // 白文字だけが残ってボタンが見えなくなるため、ここで既定テーマを適用する。
    useEffect(() => {
        if (!document.documentElement.style.getPropertyValue('--mui-page-header-color')) {
            applyThemeVars(resolveInitialTheme());
        }
    }, []);

    return (
        <Box sx={{
            padding: `${FLUID.paddingY} ${FLUID.paddingX}`,
            // iPhone のホームインジケーター（画面下端の横棒）に
            // フッターの著作権表示が重ならないよう、下端だけ安全領域を足す
            paddingBottom: `calc(${FLUID.paddingY} + env(safe-area-inset-bottom))`,
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            flexDirection: 'column',
            boxSizing: 'border-box',
            // 縦が短い端末でも内容に届くよう、はみ出す分はスクロールさせる
            overflowY: 'auto',
        }}>
            <img
                src={LoginLogoIcon}
                alt="customIcon"
                style={{
                    // 上は余白（padding）で確保し、ロゴは常に上から並べる（sp と同じ並び）
                    margin: '0 0 8px 0',
                    height: FLUID.logoHeight,
                    width: FLUID.logoWidth,
                }}
            />
            <Typography
                variant='h4'
                component="h2"
                gutterBottom
                fontWeight='600'
                sx={{
                    color: 'black',
                    fontSize: FLUID.titleFont,
                    textAlign: 'center',
                    lineHeight: 1.4,
                }}
            >
                新部品管理システム｜外部倉庫管理
            </Typography>
            {subtitle && (
                <Typography
                    gutterBottom
                    fontWeight='600'
                    sx={{
                        fontSize: FLUID.subtitleFont,
                        marginTop: FLUID.subtitleMarginTop,
                        // フォームとの間隔は formMarginTop 側で確保する（二重に空けない）
                        marginBottom: 0,
                        textAlign: 'center',
                        lineHeight: 1.6,
                    }}
                >
                    {subtitle}
                </Typography>
            )}
            <div style={{
                flex: '0 0 auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                marginTop: FLUID.formMarginTop,
            }}>
                {/* 幅は clamp で連続的に決める。maxWidth: 100% は sx 経由だと
                    CardContent に反映されないため、内側の div で受ける */}
                <div style={{ width: FLUID.formWidth, maxWidth: '100%' }}>
                    {children}
                </div>
            </div>
            <Typography
                gutterBottom
                fontWeight='600'
                sx={{
                    fontSize: FLUID.footerFont,
                    marginTop: 'auto',
                    // フッターは常に画面下端に置く（余白はリンクとの間に集める＝sp と同じ並び）
                    marginBottom: 0,
                    color: '#7f7f7f',
                    textAlign: 'center',
                }}
            >
                © nasta Transport Co., Ltd. All Rights Reserved.
            </Typography>
        </Box>
    );
};

export default LoginShell;
