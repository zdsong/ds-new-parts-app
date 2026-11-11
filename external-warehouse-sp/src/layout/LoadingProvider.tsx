import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ローディングコンテキストの型定義
interface LoadingContextType {
    loading: boolean;
    startLoading: () => void;
    stopLoading: () => void;
}

// ローディングコンテキストの作成（初期値はundefined）
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// ProviderコンポーネントのProps型定義
interface LoadingProviderProps {
    children: ReactNode;
}

// ローディング状態管理用Providerコンポーネント
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
    // ローディング状態のステート管理
    const [loading, setLoading] = useState<boolean>(false); 

    // ローディング開始処理（コールバックのメモ化）
    const startLoading = useCallback(() => {
        setLoading(true);
    }, []);

    // ローディング終了処理（コールバックのメモ化）
    const stopLoading = useCallback(() => {
        setLoading(false); 
    }, []);

    // コンテキストを子コンポーネントに提供
    return (
        <LoadingContext.Provider value={{ loading, startLoading, stopLoading }}>
            {children}
        </LoadingContext.Provider>
    );
};

// ローディングコンテキストを使用するカスタムフック
export const useLoading = (): LoadingContextType => {
    const context = useContext(LoadingContext);
    // Provider外で使用された場合はエラーをスロー
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context; 
};