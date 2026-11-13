import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { useLogout } from 'react-admin';
import { customApiCall } from '../adapters/dataProvider';

/**
 * ログインユーザー情報（AppBar 右側に表示する ID・最終ログイン・ログアウト）
 */
export interface LoginUserInfo {
    userId?: string;
    userName?: string;
    nickName?: string;
    userType?: string;
    /** 最終ログイン日時（バックエンドで yyyy/MM/dd HH:mm に整形済み） */
    lastLoginDate?: string;
    lastLoginIp?: string;
    /** 初回ログインかどうか（react-admin の認証チェックで使用） */
    firstLogin?: boolean;
}

/** ユーザー情報を保持しているブラウザキャッシュのキー（認証プロバイダーと共通） */
const USER_STORAGE_KEY = 'user';

/** アカウント区分の表示名（90:管理者、それ以外:共通アカウント） */
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    '90': '管理者',
};

/**
 * ブラウザキャッシュに保存されたユーザー情報を取得する
 * 画面表示を待たせないため、初回描画ではキャッシュの内容を使用する
 */
const readCachedUser = (): LoginUserInfo | undefined => {
    const cached = sessionStorage.getItem(USER_STORAGE_KEY);
    if (!cached) return undefined;
    try {
        return JSON.parse(cached) as LoginUserInfo;
    } catch {
        return undefined;
    }
};

/** アカウント区分の表示名を取得する */
const getAccountTypeLabel = (user?: LoginUserInfo): string => {
    if (!user?.userType) return '共通アカウント';
    return ACCOUNT_TYPE_LABELS[user.userType] ?? '共通アカウント';
};

/**
 * AppBar に表示するログインユーザー情報
 * 初回はキャッシュを表示し、最新の情報を API から取得してキャッシュを更新する
 */
export const LoginUserInfoBar: React.FC = () => {
    const logout = useLogout();
    const [user, setUser] = React.useState<LoginUserInfo | undefined>(readCachedUser);

    React.useEffect(() => {
        let active = true;

        customApiCall
            .get('api/auth/userInfo')
            .then((response) => {
                if (!active || response?.code !== 200 || !response.data) return;
                const latest = response.data as LoginUserInfo;
                // 最終ログイン日時を含めてキャッシュを更新する
                sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(latest));
                setUser(latest);
            })
            .catch(() => {
                // 取得できない場合はキャッシュの内容を表示したままとする
            });

        return () => {
            active = false;
        };
    }, []);

    // ID はユーザーID（ログインID）を表示する
    const loginId = user?.userName ?? '';
    const lastLoginDate = user?.lastLoginDate ?? '－';

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '3px',
                lineHeight: 1.2,
                mr: 1,
                whiteSpace: 'nowrap',
            }}
        >
            {/* 1 行目：ID と最終ログイン日時 */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.2, color: '#212121' }}>
                    ID: {loginId}（{getAccountTypeLabel(user)}）
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.2, color: '#212121' }}>
                    最終ログイン: {lastLoginDate}
                </Typography>
            </Box>

            {/* 2 行目：ログアウト */}
            <Box
                component="button"
                type="button"
                onClick={() => logout()}
                sx={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.75rem',
                    lineHeight: 1.2,
                    color: '#1976d2',
                    textDecoration: 'underline',
                    '&:hover': { opacity: 0.7 },
                }}
            >
                ログアウト
            </Box>
        </Box>
    );
};

export default LoginUserInfoBar;
