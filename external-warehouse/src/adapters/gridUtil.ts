import { useState, useRef, useEffect, useCallback } from 'react';
import useApiRequest from './apiUtil';

// ページネーション状態型定義
export interface PaginationState {
    pageNum: number;
    pageSize: number;
}

// ソート状態型定義
export interface SortState {
    field: string;
    order: 'ASC' | 'DESC';
}

// Hook設定オプション型定義
export interface UseAgGridPaginationOptions<T> {
    resource: string;
    defaultFilter?: Record<string, any>;
    defaultPagination?: PaginationState;
    defaultSort?: SortState;
    onError?: (error: Error) => void;
    onSuccess?: (data: T[]) => void;
    pagination?: boolean;
    searchMethod?: 'get' | 'post';
}

// Hook戻り値型定義
export interface UseAgGridPaginationReturn<T> {
    rows: T[];
    total: number;
    onPaginationChanged: (event: any) => void;
    onSortChanged: (event: any) => void;
    search: (searchParams: Record<string, any>) => void;
    postSearch:(searchParams: Record<string, any>) => void;
    refresh: () => void;
    dataSource?: any;
}

// AgGrid用ページネーションHook
export const useAgGridPagination = <T extends Record<string, any>>(
    options: UseAgGridPaginationOptions<T>
): UseAgGridPaginationReturn<T> => {
    const { request } = useApiRequest();
    
    const {
        resource,
        searchMethod = 'get',
        defaultFilter = {},
        defaultPagination = { pageNum: 1, pageSize: 20 },
        defaultSort = { field: 'id', order: 'ASC' },
        onSuccess,
        onError,
        pagination,
    } = options;

    // 状態管理
    const [rows, setRows] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [dataSource, setDataSource] = useState<any>(null);

    // gridApiとリクエストキャンセル用コントローラー
    const gridApiRef = useRef<any>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    // リクエスト重複防止用ロック
    const isRequestingRef = useRef(false);
    // 初回ロード判定フラグ
    const isFirstLoadRef = useRef(true);

    // コールバックと状態の安定化（依存ループ回避）
    const callbacksRef = useRef({ onSuccess, onError });
    const stateRef = useRef({
        searchParams: defaultFilter,
        pagination: defaultPagination,
        sort: defaultSort
    });

    // コールバック同期（親コンポーネントからの変更反映）
    useEffect(() => {
        callbacksRef.current = { onSuccess, onError };
    }, [onSuccess, onError]);

    // GETリクエスト用検索処理（リクエストロック付き）
    const search = useCallback(async (
        newSearchParams?: Record<string, any>,
        newPagination?: PaginationState,
        newSort?: SortState
    ) => {
        // 重複リクエスト防止
        if (isRequestingRef.current) return;
        
        // 前回のリクエストキャンセル
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        isRequestingRef.current = true;

        try {
            // 最新状態のマージ
            const latestState = {
                searchParams: newSearchParams || stateRef.current.searchParams,
                pagination: newPagination || stateRef.current.pagination,
                sort: newSort || stateRef.current.sort
            };

            // 状態同期
            stateRef.current = latestState;

            // GETリクエスト実行
            const result = await request('get', resource, {
                ...latestState.pagination,
                ...latestState.searchParams,
            });

            // UI状態更新
            setRows(result.rows);
            setTotal(result.total);

            // ページネーション有効時にdataSource構築
            if (pagination) {
                setDataSource({
                    getRows: (params: any) => {
                        params.successCallback(result.rows, result.total);
                    }
                });
            }

            // 成功コールバック実行
            callbacksRef.current.onSuccess?.(result.rows);
        } catch (err) {
            // リクエストキャンセルエラーは無視
            if ((err as Error).name !== 'AbortError') {
                const errorObj = err instanceof Error ? err : new Error('データ取得に失敗しました');
                callbacksRef.current.onError?.(errorObj);
            }
        } finally {
            isRequestingRef.current = false;
            // 初回ロード完了マーク
            if (isFirstLoadRef.current) {
                isFirstLoadRef.current = false;
            }
        }
    }, [resource, request, pagination]);

    // POSTリクエスト用検索処理（リクエストロック付き）
    const postSearch = useCallback(async (
        newSearchParams?: Record<string, any>,
        newPagination?: PaginationState,
        newSort?: SortState
    ) => {
        // 重複リクエスト防止
        if (isRequestingRef.current) return;
        
        // 前回のリクエストキャンセル
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        isRequestingRef.current = true;

        try {
            // 最新状態のマージ
            const latestState = {
                searchParams: newSearchParams || stateRef.current.searchParams,
                pagination: newPagination || stateRef.current.pagination,
                sort: newSort || stateRef.current.sort
            };

            // 状態同期
            stateRef.current = latestState;

            // POSTリクエスト実行
            const result = await request('post', resource, {
                ...latestState.searchParams,
            },latestState.pagination);

            // UI状態更新
            setRows(result.rows);
            setTotal(result.total);

            // ページネーション有効時にdataSource構築
            if (pagination) {
                setDataSource({
                    getRows: (params: any) => {
                        params.successCallback(result.rows, result.total);
                    }
                });
            }

            // 成功コールバック実行
            callbacksRef.current.onSuccess?.(result.rows);
        } catch (err) {
            // リクエストキャンセルエラーは無視
            if ((err as Error).name !== 'AbortError') {
                const errorObj = err instanceof Error ? err : new Error('データ取得に失敗しました');
                callbacksRef.current.onError?.(errorObj);
            }
        } finally {
            isRequestingRef.current = false;
            // 初回ロード完了マーク
            if (isFirstLoadRef.current) {
                isFirstLoadRef.current = false;
            }
        }
    }, [resource, request, pagination]);

    // データリフレッシュ処理
    const refresh = useCallback(() => {
        const currentState = stateRef.current;
        search(currentState.searchParams, currentState.pagination, currentState.sort);
    }, [search]);

    // ページネーション変更イベント処理
    const onPaginationChanged = useCallback((event: any) => {
        if (!event.api || isFirstLoadRef.current) return; // 初回ロードはスキップ

        gridApiRef.current = event.api;
        // AgGridの0起点を1起点に変換
        const currentPage = event.api.paginationGetCurrentPage() + 1;
        const pageSize = event.api.paginationGetPageSize();
        const currentPagination = stateRef.current.pagination;

        // ページネーション変更判定
        const isPaginationChanged = currentPage !== currentPagination.pageNum || 
                                   pageSize !== currentPagination.pageSize;

        if (isPaginationChanged && !isRequestingRef.current) {
            if(searchMethod === 'get'){
                search(
                    stateRef.current.searchParams,
                    { pageNum: currentPage, pageSize },
                    stateRef.current.sort
                );
            }else if(searchMethod === 'post'){
                postSearch(
                    stateRef.current.searchParams,
                    { pageNum: currentPage, pageSize },
                    stateRef.current.sort
                );
            }
            
        }
    }, [search]);

    // ソート変更イベント処理
    const onSortChanged = useCallback((event: any) => {
        if (!event.api || isFirstLoadRef.current) return;

        gridApiRef.current = event.api;
        const sortModel = event.api.getSortModel();
        let newSort: SortState | undefined;

        if (sortModel.length > 0) {
            const { colId: field, sort: order } = sortModel[0];
            newSort = { field, order: order.toUpperCase() as 'ASC' | 'DESC' };
        } else {
            newSort = defaultSort;
        }

        const currentSort = stateRef.current.sort;
        // ソート条件変更判定
        if (newSort && (currentSort.field !== newSort.field || currentSort.order !== newSort.order)) {
            search(
                stateRef.current.searchParams,
                stateRef.current.pagination,
                newSort
            );
        }
    }, [search, defaultSort]);

    // 外部検索用インターフェース（GET、ページネーションリセット）
    const handleSearch = useCallback((searchParams: Record<string, any>) => {
        isFirstLoadRef.current = false;
        search(searchParams, { pageNum: 1, pageSize: defaultPagination.pageSize }, stateRef.current.sort);
    }, [search, defaultPagination.pageSize]);

    // 外部検索用インターフェース（POST、ページネーションリセット）
    const handlePostSearch = useCallback((searchParams: Record<string, any>) => {
        isFirstLoadRef.current = false;
        postSearch(searchParams, { pageNum: 1, pageSize: defaultPagination.pageSize }, stateRef.current.sort);
    }, [search, defaultPagination.pageSize]);

    return {
        rows,
        total,
        dataSource,
        onPaginationChanged,
        onSortChanged,
        search: handleSearch,
        postSearch:handlePostSearch,
        refresh
    };
};