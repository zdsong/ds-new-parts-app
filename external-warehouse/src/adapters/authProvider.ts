import { AuthProvider } from 'react-admin';
import { customApiCall } from './dataProvider';

// 現在のルートパス取得（hashルーティング対応）
const getCurrentPath = () => {
    const hash = window.location.hash;
    return hash ? hash.slice(1) : '/';
};

// API基底URL
const apiUrl  = import.meta.env.VITE_API_URL;

// ログインパラメータ型定義
interface LoginParams {
    username: string;
    password: string;
}

// 認証コード検証パラメータ
interface verifyParam {
    verifyCode: string
}

// メール送信パラメータ
interface sendMailParam {
    mailAddress: string
}

// 認証レスポンス型定義
interface AuthResponse {
    code: number;
    message: string;
    data: string;
}

// APIレスポンス共通型定義
interface CustomApiResponse<T = any> {
    code: number;
    message: string;
    data?: T;
    [key: string]: any;
}

/**
 * エラー処理共通関数
 * @param error エラーオブジェクト
 * @param response レスポンスオブジェクト（任意）
 * @returns フォーマット済みエラー
 */
const handleError = (error: unknown, response?: Response | CustomApiResponse) => {
    let errorMsg = '予期せぬエラーが発生しました';
    // バックエンドのmessage優先
    if (response) {
        if (response instanceof Response) {
            try {
                const responseData = (response as unknown) as CustomApiResponse;
                if (responseData.message) {
                    errorMsg = responseData.message;
                }
            } catch {
                errorMsg = response.statusText || errorMsg;
            }
        } else {
            if (response.message) {
                errorMsg = response.message;
            }
        }
    }

    // ネットワークエラー
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error('接続に失敗しました');
    }

    // その他エラー
    if (error instanceof Error && !response) {
        errorMsg = error.message || errorMsg;
    }

    return new Error(errorMsg);
};

// React Admin認証プロバイダー
export const authProvider: AuthProvider = {
    // 認証コードによるログイン
    login: async ({ verifyCode }: verifyParam) => {
        const tempToken = sessionStorage.getItem('tempToken')
        if(!tempToken) throw handleError(new Error('トークンが取得できませんでした'));

        const request = new Request(`${apiUrl}/api/auth/loginByCode`, {
            method: 'POST',
            body: JSON.stringify({ tempToken, verifyCode }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
        
        try {
            const response = await fetch(request);
            const responseData = await response.json().catch(() => ({})) as CustomApiResponse<any>;

            if (!response.ok) {
                throw handleError(new Error(response.statusText), responseData);
            }

            if (!responseData.data) {
                throw handleError(new Error('トークンが取得できませんでした'), responseData);
            }
            
            // Token保存
            sessionStorage.setItem('externalWarehouseToken', responseData.data);
            sessionStorage.removeItem('tempToken');

              return responseData;
        } catch (error) {
            const formattedError = handleError(error);
            throw formattedError;
        }
    },

    // ユーザー名/パスワードによるログイン（tempToken取得）
    logSend: async ({ username, password }: LoginParams) => {
        const request = new Request(`${apiUrl}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
        
        try {
            const response = await fetch(request);
            const responseData = await response.json().catch(() => ({})) as CustomApiResponse<any>;

            if (!response.ok) {
                throw handleError(new Error(response.statusText), responseData);
            }

            if (!responseData.data) {
                throw handleError(new Error('トークンが取得できませんでした'), responseData);
            }
            
            sessionStorage.setItem('tempToken', responseData.data);

            return responseData;
        } catch (error) {
            const formattedError = handleError(error);
            throw formattedError;
        }
    },

    // 直接ログイン（ユーザーID/パスワード検証 + トークン検証）
    directLogin: async ({ username, password }: LoginParams) => {
        const request = new Request(`${apiUrl}/api/auth/directLogin`, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });

        try {
            const response = await fetch(request);
            const responseData = await response.json().catch(() => ({})) as CustomApiResponse<any>;

            if (!response.ok) {
                throw handleError(new Error(response.statusText), responseData);
            }

            if (!responseData.data) {
                throw handleError(new Error('トークンが取得できませんでした'), responseData);
            }

            // トークンを保存
            sessionStorage.setItem('externalWarehouseToken', responseData.data);

            // トークンの正確性を検証
            const verifyResponse: CustomApiResponse = await customApiCall.get('api/auth/userInfo');
            if (verifyResponse.code < 200 || verifyResponse.code >= 300 || !verifyResponse.data) {
                sessionStorage.removeItem('externalWarehouseToken');
                throw handleError(new Error('トークンの検証に失敗しました'), verifyResponse);
            }
            sessionStorage.setItem('user', JSON.stringify(verifyResponse.data));

            return responseData;
        } catch (error) {
            const formattedError = handleError(error);
            throw formattedError;
        }
    },

    // 認証コード送信（メールアドレス指定）
    sendMail: async ({ mailAddress }: sendMailParam) => {
        const request = new Request(`${apiUrl}/api/auth/sendAuthCode`, {
            method: 'POST',
            body: JSON.stringify({ mailAddress }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
        
        try {
            const response = await fetch(request);
            const responseData = await response.json().catch(() => ({})) as CustomApiResponse<any>;

            if (!response.ok) {
                throw handleError(new Error(response.statusText), responseData);
            }

            if (!responseData.data) {
                throw handleError(new Error('トークンが取得できませんでした'), responseData);
            }
            
            sessionStorage.setItem('tempToken', responseData.data);

            return responseData;
        } catch (error) {
            const formattedError = handleError(error);
            throw formattedError;
        }
    },
    
    // 認証コード再送信
    resendCode: async () => {
        const tempToken = sessionStorage.getItem('tempToken')

        const request = new Request(`${apiUrl}/api/auth/resendAuthCode`, {
            method: 'POST',
            body: JSON.stringify({ tempToken }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
        
        try {
            const response = await fetch(request);
            const responseData = await response.json().catch(() => ({})) as CustomApiResponse<any>;

            if (!response.ok) {
                throw handleError(new Error(response.statusText), responseData);
            }

            if (!responseData.data) {
                throw handleError(new Error('トークンが取得できませんでした'), responseData);
            }
            
            sessionStorage.setItem('tempToken', responseData.data);

            return responseData;
        } catch (error) {
            const formattedError = handleError(error);
            throw formattedError;
        }
    },

    // ログアウト処理
    logout: async () => {
        if(sessionStorage.getItem('externalWarehouseToken')){
            await customApiCall.get('api/auth/logout'); 
            sessionStorage.removeItem('externalWarehouseToken');
            sessionStorage.removeItem('permissions');
            sessionStorage.removeItem('tempToken');
            window.location.reload();
        }
        
        return Promise.resolve();
    },
    
    // 認証エラーチェック
    checkError: ({ status, data }: { status: number; data?: CustomApiResponse }) => {
        if (status === 401) {
            const errorMsg = data?.message || 'セッションが無効または期限切れです。再ログインしてください';
            return Promise.reject(new Error(errorMsg));
        } else if(status === 403) {
            const errorMsg = data?.message || 'アクセス権限がありません';
            return Promise.reject(new Error(errorMsg));
        }
        if (data?.message) {
            return Promise.reject(new Error(data.message));
        }
        return Promise.resolve();
    },
    
    // 認証状態チェック
    checkAuth: async () => {
        const currentPath = getCurrentPath();

        if (currentPath.startsWith('/login')) {
            return Promise.resolve();
        }

        const token = sessionStorage.getItem('externalWarehouseToken');
        
        if (!token) {
            return Promise.reject(new Error('トークンが存在しません。再ログインしてください'));
        }
        
        try {
            const response: CustomApiResponse = await customApiCall.get('api/auth/userInfo');
            
            if (response.code < 200 || response.code >= 300) {
                throw handleError(new Error('認証に失敗しました'), response);
            }
            sessionStorage.setItem('user', JSON.stringify(response.data));
            return Promise.resolve();
        } catch (error) {
            const errorMsg = (error as Error).message;
            if (errorMsg.includes('認証に失敗しました') || errorMsg.includes('セッション')) {
                sessionStorage.removeItem('crmToken');
            }
            const formattedError = handleError(error);
            return Promise.reject(formattedError);
        }
    },

    checkLogin: () => {
        const token = sessionStorage.getItem('externalWarehouseToken');
        if (!token) {
            return false
        }
        return true
    },
    
    // コールバック処理（OAuth等）
    handleCallback: () => {
        const token = sessionStorage.getItem('externalWarehouseToken');
        if (token) {
            return Promise.resolve();
        }
        return Promise.reject(new Error('トークンの検証に失敗しました'));
    },

    // ユーザー情報取得
    getIdentity: async () => {
        const token = sessionStorage.getItem('externalWarehouseToken');
        if (!token) {
            return Promise.reject(new Error('トークンが存在しません'));
        }
        try {
            const response = await customApiCall.get('api/auth/userInfo');
            
            if (response.code < 200 || response.code >= 300) {
                throw handleError(new Error('ユーザー情報の取得に失敗しました'), response);
            }
            
            if (!response.data?.id || !response.data?.username) {
                throw handleError(new Error('ユーザー情報が不完全です'), response);
            }
            return Promise.resolve({
                id: response.data.id,
                fullName: response.data.username,
            });
        } catch (error) {
            const formattedError = handleError(error);
            return Promise.reject(formattedError);
        }
    },
};