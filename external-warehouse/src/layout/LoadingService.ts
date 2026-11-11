import { useLoading } from './LoadingProvider';

// ローディング状態管理用シングルトンサービスクラス
export class LoadingService {
    // シングルトンインスタンス
    private static instance: LoadingService;
    // ローディング制御メソッドの参照
    private startLoading?: () => void;
    private stopLoading?: () => void;

    // プライベートコンストラクタ（外部からのインスタンス生成を禁止）
    private constructor() {}

    // シングルトンインスタンス取得メソッド
    static getInstance(): LoadingService {
        if (!LoadingService.instance) {
            LoadingService.instance = new LoadingService();
        }
        return LoadingService.instance;
    }

    // ローディング制御メソッドの初期化
    initialize(startLoading: () => void, stopLoading: () => void) {
        this.startLoading = startLoading;
        this.stopLoading = stopLoading;
    }

    // ローディング表示
    show(): void {
        if (this.startLoading) {
            this.startLoading();
        }
    }

    // ローディング非表示
    hide(): void {
        if (this.stopLoading) {
            this.stopLoading();
        }
    }

    // Promise実行中に自動でローディングを表示/非表示するラッパーメソッド
    async withLoading<T>(promise: Promise<T>): Promise<T> {
        this.show();
        try {
            const result = await promise;
            this.hide();
            return result;
        } catch (error) {
            this.hide();
            throw error; // エラーを再スローして呼び出し元で処理可能に
        }
    }
}

// コンポーネントから使用するためのカスタムフック
export const useLoadingService = () => {
    // LoadingProviderから制御メソッドを取得
    const { startLoading, stopLoading } = useLoading();
    // シングルトンサービスインスタンスを取得し初期化
    const service = LoadingService.getInstance();
    service.initialize(startLoading, stopLoading);
    return service;
};