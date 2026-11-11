import React, { 
    useRef, 
    useState, 
    useImperativeHandle, 
    forwardRef 
  } from 'react';
  import { Pagination } from '@mui/material';
import { paginationContainerStyle } from '../styles/gridSx';
  
  /**
   * プロップスのインターフェース定義
   */
  interface DataListWithButtonProps {
    // 表示するデータリスト
    data: any[];
    // リストアイテムごとのカードコンポーネントをレンダリングするコールバック関数
    renderCard: (item: any, index: number) => React.ReactNode;
    // データの総件数
    rowTotal: number;
    // ボタンクリック時に実行されるロード処理のコールバック
    // 引数：現在のページ番号、1ページあたりの表示件数
    pageChange: (current: number, pageSize: number) => void;
    // 1ページあたりの表示件数
    pageSize?: number;

  }
  
  /**
   * 外部から参照可能なメソッドのインターフェース定義
   */
  interface DataListWithPaginationRef {
    // ページ番号を初期値にリセットするメソッド
    resetPage: () => void;
    // 1ページあたりの表示件数を取得するメソッド
    getPageSize: () => number
  }
  
  /**
   * ボタンクリックでデータ読み込みするリストコンポーネント
   * @param props - コンポーネントに渡されるプロップス
   * @param ref - 外部から参照するためのrefオブジェクト
   */
  const DataListWithPagination = forwardRef<DataListWithPaginationRef, DataListWithButtonProps>(
    (
      {
        data = [],
        renderCard,
        rowTotal = 0,
        pageChange,
        pageSize = 10,
      },
      ref
    ) => {

      // リストコンテナ要素への参照
      const listContainerRef = useRef<HTMLDivElement>(null);
      // 現在のページ番号（状態管理）
      const [current, setCurrent] = useState<number>(1);
  
      // 外部から呼び出し可能なメソッドを公開
      useImperativeHandle(ref, () => ({
        resetPage: () => {
          setCurrent(1);
        },
        getPageSize: () => {
          return pageSize
        }
      }));

      // ページネーション変更処理
      const handlePageChange = async (event: React.ChangeEvent<unknown>, value: number) => {
        await pageChange(value, pageSize);
        setCurrent(value)
        if (listContainerRef.current) {
          listContainerRef.current.scrollTop = 0;
        }
      };

  
      return (
        <>
        <div
          ref={listContainerRef}
          style={{
            overflowY: 'auto',     // 垂直方向のスクロールを許可
            overflowX: 'hidden',   // 水平方向のスクロールを禁止
            width: '100%',         // 親要素の幅いっぱいに表示
            height: '100%'
          }}
        >
          {/* データリストの表示エリア */}
          <div>
            {data.map((item, index) => renderCard(item, index))}
          </div>
          
        </div>
        <div style={paginationContainerStyle}>
        {rowTotal !== 0 ? <Pagination
          count={Math.ceil((rowTotal || 0) / (pageSize || 1)) || 0}
          page={current}
          onChange={handlePageChange}
          color="primary"
          size="small"
          showFirstButton
          showLastButton
        /> : ''}
        </div>
        </>
      );
    }
  );
  
  // コンポーネントの表示名を設定
  DataListWithPagination.displayName = 'DataListWithButton';
  
  export default DataListWithPagination;