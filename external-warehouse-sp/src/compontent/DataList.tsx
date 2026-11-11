import React, { 
  useEffect, 
  useRef, 
  useCallback, 
  useState, 
  useImperativeHandle, 
  forwardRef 
} from 'react';
import { CircularProgress, Typography } from '@mui/material';

/**
 * プロップスのインターフェース定義
 */
interface InfiniteScrollListProps {
  // 表示するデータリスト
  data: any[];
  // リストアイテムごとのカードコンポーネントをレンダリングするコールバック関数
  renderCard: (item: any, index: number) => React.ReactNode;
  // データの総件数
  rowTotal: number;
  // スクロールが下部に到達した際に実行されるロード処理のコールバック
  // 引数：現在のページ番号、1ページあたりの表示件数
  onLoadMore: (current: number, pageSize: number) => void;
  // データ読み込み中の状態フラグ
  isLoading: boolean;
  // 下部検知の閾値（ピクセル単位）：指定した値だけ下部に近づいたらロードをトリガー
  bottomThreshold?: number;
  // スクロールイベントのデバウンス時間（ミリ秒）
  debounceTime?: number;
  // 1ページあたりの表示件数
  pageSize?: number;
  // 初期表示するページ番号
  initialCurrent?: number;
}

/**
 * 外部から参照可能なメソッドのインターフェース定義
 */
interface InfiniteScrollListRef {
  // ページ番号を初期値にリセットするメソッド
  resetPage: () => void;
  // 1ページあたりの表示件数を取得するメソッド
  getPageSize: () => number
}

/**
 * モバイル端末向け無限スクロールリストコンポーネント
 * 内部でページ番号を管理し、スクロールが下部に到達すると自動的にページ番号をインクリメント
 * 外部にはページリセットメソッドを公開
 * @param props - コンポーネントに渡されるプロップス
 * @param ref - 外部から参照するためのrefオブジェクト
 */
const InfiniteScrollList = forwardRef<InfiniteScrollListRef, InfiniteScrollListProps>(
  (
    {
      data = [],
      renderCard,
      rowTotal = 0,
      onLoadMore,
      isLoading,
      bottomThreshold = 100,
      debounceTime = 300,
      pageSize = 10,
      initialCurrent = 1,
    },
    ref
  ) => {
    // リストコンテナ要素への参照
    const listContainerRef = useRef<HTMLDivElement>(null);
    // デバウンス処理用のタイマーIDを保持するref
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    // 現在のページ番号（状態管理）
    const [current, setCurrent] = useState<number>(initialCurrent);
    // 読み込むデータがまだ存在するか判定
    // 条件：現在表示中のデータ数 < 総件数 かつ 総件数 > 0
    const hasMore = data.length < rowTotal && rowTotal > 0;

    // 外部から呼び出し可能なメソッドを公開
    useImperativeHandle(ref, () => ({
      // ページ番号を初期値にリセットするメソッド
      resetPage: () => {
        setCurrent(initialCurrent);
        // デバウンスタイマーが存在する場合はクリア
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      },
      // 1ページあたりの表示件数を返却するメソッド
      getPageSize: () => {
        return pageSize
      }
    }));

    // スクロールイベントハンドラ（コールバックのメモ化）
    const handleScroll = useCallback(() => {
      // 読み込み中または読み込むデータがない場合は処理を中断
      if (isLoading || !hasMore) return;
      
      // 既存のデバウンスタイマーが存在する場合はクリア
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // デバウンス処理：指定時間後に下部検知ロジックを実行
      debounceTimerRef.current = setTimeout(() => {
        // コンテナ要素が取得できない場合は処理を中断
        if (!listContainerRef.current) return;
        
        // スクロール関連のDOM情報を取得
        const { scrollTop, scrollHeight, clientHeight } = listContainerRef.current;
        // コンテナ下部までの距離を計算
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        
        // 下部までの距離が閾値以下の場合、更多データをロード
        if (distanceToBottom < bottomThreshold) {
          onLoadMore(current + 1, pageSize);
          // ページ番号をインクリメント
          setCurrent(prev => prev + 1);
        }
      }, debounceTime);
    }, [isLoading, hasMore, bottomThreshold, debounceTime, onLoadMore, current, pageSize]);

    // スクロールイベントの登録/解除処理
    useEffect(() => {
      const container = listContainerRef.current;
      // コンテナ要素が取得できない場合は処理を中断
      if (!container) return;

      // スクロールイベントリスナーを登録
      container.addEventListener('scroll', handleScroll);
      
      // クリーンアップ関数：コンポーネントアンマウント時にイベントリスナーを解除
      return () => {
        container.removeEventListener('scroll', handleScroll);
        // 残存するデバウンスタイマーをクリア
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, [handleScroll]);

    return (
      <div
        ref={listContainerRef}
        style={{
          overflowY: 'auto',     // 垂直方向のスクロールを許可
          overflowX: 'hidden',   // 水平方向のスクロールを禁止
          height: '100%',        // 親要素の高さいっぱいに表示
          width: '100%',         // 親要素の幅いっぱいに表示
        }}
      >
        {/* データリストの表示エリア */}
        <div>
          {data.map((item, index) => renderCard(item, index))}
        </div>

        {/* 読み込み状態/終了状態のフッター表示 */}
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          {/* 読み込み中：ローディングスピナーを表示 */}
          {isLoading && <CircularProgress size={20} />}
          {/* 読み込み完了かつ更多データなし：メッセージを表示 */}
          {!isLoading && !hasMore && (
            <Typography variant="caption" color="text.secondary">
              {data.length > 0 ? '' : '該当するデータはありません。'}
            </Typography>
          )}
        </div>
      </div>
    );
  }
);

// コンポーネントの表示名を設定（デベロッパーツールなどで識別しやすくする）
InfiniteScrollList.displayName = 'InfiniteScrollList';

export default InfiniteScrollList;