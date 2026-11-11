import { fetchUtils, DataProvider, HttpError } from 'react-admin';
import simpleRestProvider from 'ra-data-simple-rest';

// API基底URL
const apiUrl = import.meta.env.VITE_API_URL;

// APIレスポンス共通型
interface ApiResponse {
    code: number,
    message: string,
    [key: string]: any;
}

// カスタムfetch処理（ネットワークエラーハンドリング）
const customFetchJson = (url: any, options = {}, showFlg?: boolean) => {
    return fetchUtils.fetchJson(url, options)
        .catch(error => {
            if(showFlg){
                if (error.message.includes('Failed to fetch')) {
                    throw new Error('接続に失敗しました');
                }
                if (error instanceof HttpError) {
                    const { status, body, message } = error;
                    switch (status) {
                        case 401:
                            throw new Error('認証情報が無効です。再度ログインしてください。');
                        case 403:
                            throw new Error('セキュリティ上、禁則文字が入力されています。');
                        case 404:
                            throw new Error('データが見つかりません。');
                        case 500:
                            throw new Error('サーバー側でエラーが発生しました。');
                        default:
                            throw new Error(body?.message || message || `エラーが発生しました (${status})`);
                    }
                }
                console.error('予期せぬエラー:', error);
                throw error; // その他エラーはそのままスロー
            }
            return {
                status: 500,
                headers: new Headers(),
                body: '',
                json: null
            }
        });
};

// HTTPクライアント（JWT Token付与）
const httpClient = (url: string, options: fetchUtils.Options = {}, showFlg?: boolean) => {
    const token = sessionStorage.getItem('externalWarehouseToken');
    const customOptions = { ...options };

    if (!customOptions.headers) {
        customOptions.headers = new Headers({ Accept: 'application/json' });
    }

    // Tokenが存在する場合はAuthorizationヘッダーに追加
    if (token) {
        (customOptions.headers as Headers).set('Authorization', `Bearer ${token}`);
    }

    return customFetchJson(url, customOptions, showFlg);
};

// 基本データプロバイダー作成
const baseDataProvider = simpleRestProvider(apiUrl, httpClient);

// カスタムAPIオプション型定義
export interface CustomApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    headers?: Headers;
    queryParams?: Record<string, any>;
}

// クエリパラメータをクエリ文字列に変換
export const buildQueryString = (params?: Record<string, any>): string => {
    if (!params || Object.keys(params).length === 0) {
        return '';
    }

    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    });

    return searchParams.toString();
};

// カスタムデータプロバイダー（CRM用API拡張）
export const dataProvider: DataProvider & {
    customApi: (endpoint: string, options?: CustomApiOptions, showFlg?: boolean) => Promise<any>;
} = {
    ...baseDataProvider,

    // カスタムAPI呼び出しメソッド
    customApi: (endpoint: string, options: CustomApiOptions = {}, showFlg?: boolean) => {
        const { method = 'GET', body, queryParams } = options;

        let url = `${apiUrl}/${endpoint}`;

        // 絶対URLが指定された場合はそのまま使用する
        if (endpoint.startsWith('http') === true) {
            url = `${endpoint}`;
        }

        // クエリパラメータ追加
        if (queryParams && Object.keys(queryParams).length > 0) {
            const queryString = fetchUtils.queryParameters(queryParams);
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        const requestOptions: fetchUtils.Options = {
            method,
        };

        // リクエストボディ設定
        if (body) {
            // FormDataの場合はJSON変換しない
            if (body instanceof FormData) {
                requestOptions.body = body;
            } else {
                requestOptions.body = JSON.stringify(body);
            }
        }

        // レスポンス処理（jsonが存在する場合は返す）
        return httpClient(url, requestOptions, showFlg).then((response) => {
            if (response.json !== undefined) {
                return response.json;
            }
            return response;
        });
    },
};

// 独立したAPI呼び出し関数（コンポーネントで直接使用）
export const customApiCall = {

    // GETリクエスト
    get: async (endpoint: string, data?: any, queryParams?: Record<string, any>, showFlg?: boolean): Promise<ApiResponse> => {
        const newQueryParams = {
            ...data,
            ...queryParams
        }

        return dataProvider.customApi(endpoint, {
            method: 'GET',
            queryParams: newQueryParams,
        }, showFlg);
    },

    // POSTリクエスト
    post: (endpoint: string, data: any, queryParams?: Record<string, any>, showFlg?: boolean) => {
        return dataProvider.customApi(endpoint, {
            method: 'POST',
            body: data,
            queryParams,
        }, showFlg);
    },

    // PUTリクエスト
    put: (endpoint: string, data: any, queryParams?: Record<string, any>, showFlg?: boolean) => {
        return dataProvider.customApi(endpoint, {
            method: 'PUT',
            body: data,
            queryParams,
        }, showFlg);
    },

    // DELETEリクエスト
    delete: (endpoint: string, queryParams?: Record<string, any>, showFlg?: boolean) => {
        return dataProvider.customApi(endpoint, {
            method: 'DELETE',
            queryParams,
        }, showFlg);
    },
};