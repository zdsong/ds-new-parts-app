// src/components/DataGrid/DataGrid.tsx
import React, { useState, useMemo, useCallback, useImperativeHandle, forwardRef, RefAttributes, PropsWithoutRef, useEffect, CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  GridReadyEvent, 
  GetRowIdParams, 
  CheckboxSelectionCallbackParams,
  GridApi,
  GridOptions,
  GetRowIdFunc,
  AllCommunityModule,
  ModuleRegistry,
  RowClassParams,
  RowStyle
} from 'ag-grid-community';
import Pagination from '@mui/material/Pagination';

// AG Gridコミュニティモジュール登録
ModuleRegistry.registerModules([AllCommunityModule]);

// スタイルインポート
import {
  gridContainerBaseStyle,
  paginationContainerStyle,
  radioButtonStyle,
  radioWrapperStyle,
  getSelectionColumnStyles,
  getGridBaseOptions,
  columnBaseStyle,
  gridStyles
} from '../styles/gridSx';

// 基礎インターフェース（idフィールド必須）
export interface BaseItemColumn {
  id: string | number;
}

// 親コンポーネントに暴露するメソッドインターフェース
export interface DataGridRef<T extends BaseItemColumn> {
  getSelectedRows: () => T[];
  clearSelection: () => void;
  getPageSize: () => number;
}

// コンポーネントPropsインターフェース
interface DataGridProps<T extends BaseItemColumn> {
  columnDefs: ColDef<T>[];
  rowData: T[];
  defaultColDef?: ColDef<T>;
  rowTotal?: number;
  page: number;
  pageSize?: number;
  onPageChange: (current: number, pageSize: number) => void;
  rowHeight?: number;
  enableDebug?: boolean;
  gridContainerStyle?: React.CSSProperties;
  selectionMode?: 'single' | 'multiple' | 'none';
  rowUniqueKey?: keyof T;
  onSelectionChange?: (selectedRows: T[]) => void;
  pagination?: boolean;
  noRowsShow?: string;
  pinnedBottomRowData?: any;
  sortable?: boolean;
  getRowStyle?: (params: RowClassParams<T, any>) => RowStyle | undefined;
}

// デフォルト列定義
const DEFAULT_COL_DEF: ColDef = {
  sortable: false,
  filter: false,
  resizable: true,
  minWidth: 100,
};

// 汎用DataGridコンポーネント
const DataGrid = forwardRef(
  function <T extends BaseItemColumn>(
    props: DataGridProps<T>,
    ref: React.Ref<DataGridRef<T>>
  ) {
    const {
      columnDefs,
      rowData,
      defaultColDef = DEFAULT_COL_DEF,
      rowTotal = 0,
      pageSize = 10,
      page,
      onPageChange,
      rowHeight = 35,
      enableDebug = false,
      gridContainerStyle,
      selectionMode = 'none',
      rowUniqueKey = 'id',
      onSelectionChange,
      pagination = false,
      noRowsShow = '該当するデータはありません。',
      pinnedBottomRowData,
      sortable = false,
      getRowStyle
    } = props;

    // Grid API保存
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    // 単一選択時の選択行
    const [selectedRow, setSelectedRow] = useState<T | null>(null);

    // ページネーション変更処理
    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
      onPageChange(value, pageSize);
    };

    // Grid初期化完了処理
    const handleGridReady = useCallback((params: GridReadyEvent<T>) => {
      setGridApi(params.api);
    }, [enableDebug]);

    // 行の一意ID取得（型安全）
    const getRowId: GetRowIdFunc<T> = useCallback((params: GetRowIdParams<T>) => {
      return String(params.data[rowUniqueKey]);
    }, [rowUniqueKey]);

    // 選択列定義
    const selectionColumn = useMemo<ColDef<T>>(() => {
      const selectionColStyles = getSelectionColumnStyles(selectionMode);

      if (selectionMode === 'none') {
        return {
          ...selectionColStyles,
          ...columnBaseStyle,
          hide: true,
          sortable: false,
          width: selectionColStyles.width as number,
          maxWidth: selectionColStyles.maxWidth as number,
        };
      }

      if (selectionMode === 'multiple') {
        return {
          headerName: '選択',
          ...selectionColStyles,
          ...columnBaseStyle,
          sortable: false,
          checkboxSelection: (params: CheckboxSelectionCallbackParams<T>) => true,
          valueGetter: () => null,
        };
      }

      // 単一選択モード
      return {
        headerName: '選択',
        ...selectionColStyles,
        ...columnBaseStyle,
        sortable: false,
        cellRenderer: ({ data }: { data: T }) => (
          <div style={radioWrapperStyle}>
            <input
              type="radio"
              checked={selectedRow?.[rowUniqueKey] === data[rowUniqueKey]}
              onChange={() => setSelectedRow(data)}
              style={radioButtonStyle}
            />
          </div>
        ),
        valueGetter: () => null,
      };
    }, [selectionMode, selectedRow, rowUniqueKey]);

    // 選択列 + 業務列をマージ
    const memoizedColumnDefs = useMemo<ColDef<T>[]>(
      () => [
        selectionColumn,
        ...columnDefs.map((col) => {
          const mergedCol = {
            ...DEFAULT_COL_DEF,
            sortable,
            ...col,
          } as ColDef<T>;
          
          if (mergedCol.width === undefined && mergedCol.flex === undefined) {
            mergedCol.flex = 1;
          }
          
          return mergedCol;
        })
      ],
      [selectionColumn, columnDefs, sortable]
    );
    // 選択行取得（単一/複数対応）
    const getSelectedRows = useCallback((): T[] => {
      if (selectionMode === 'single') {
        return selectedRow ? [selectedRow] : [];
      }
      if (selectionMode === 'multiple' && gridApi) {
        return gridApi.getSelectedRows() as T[];
      }
      return [];
    }, [selectionMode, selectedRow, gridApi]);

    // ページサイズ取得
    const getPageSize = useCallback(() => {
      return pageSize
    }, [pageSize, gridApi]);

    // 選択状態クリア
    const clearSelection = useCallback(() => {
      if (selectionMode === 'single') {
        setSelectedRow(null);
      } else if (selectionMode === 'multiple' && gridApi) {
        gridApi.deselectAll();
      }
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }, [selectionMode, gridApi, onSelectionChange]);

    // 選択変更イベント処理（複数選択時）
    const handleSelectionChanged = useCallback(() => {
      if (selectionMode === 'multiple' && onSelectionChange) {
        onSelectionChange(getSelectedRows());
      }
    }, [selectionMode, getSelectedRows, onSelectionChange]);

    // 親コンポーネントにメソッド暴露
    useImperativeHandle(
      ref,
      () => ({
        getSelectedRows,
        clearSelection,
        getPageSize
      }),
      [getSelectedRows, clearSelection]
    );

    // Gridオプションマージ（型安全）
    const mergedGridOptions = useMemo<GridOptions<T>>(() => 
      ({
        ...getGridBaseOptions<T>(rowHeight, selectionMode), 
        suppressColumnMove: true,
        suppressDragLeaveHidesColumns: true,
      }),
    [rowHeight, selectionMode]);

    // コンテナスタイルマージ
    const mergedContainerStyle = useMemo<CSSProperties>(() => ({
      ...gridContainerBaseStyle,
      ...gridContainerStyle,
    }), [gridContainerStyle]);

    const noRowsTemplate = `
      <div style="padding: 20px; text-align: center; color: #666; font-size: 14px;">
        ${noRowsShow}
      </div>
    `;

    return (
      <div style={mergedContainerStyle}>
        <style>{gridStyles}</style>
        <AgGridReact<T>
          columnDefs={memoizedColumnDefs}
          rowData={rowData}
          defaultColDef={defaultColDef}
          rowHeight={rowHeight}
          pagination={false}
          getRowId={getRowId}
          onGridReady={handleGridReady}
          gridOptions={mergedGridOptions}
          domLayout="autoHeight"
          onSelectionChanged={handleSelectionChanged}
          suppressCellFocus = {true}
          overlayNoRowsTemplate={noRowsTemplate}
          pinnedBottomRowData={pinnedBottomRowData}
          getRowStyle={getRowStyle}
        />
        {/* ページネーション表示 */}
        {pagination && (
          <div style={paginationContainerStyle}>
            <Pagination
              count={Math.ceil((rowTotal || 0) / (pageSize || 1)) || 0}
              page={page}
              onChange={handlePageChange}
              color="primary"
              size="medium"
              showFirstButton
              showLastButton
            />
          </div>
        )}
      </div>
    );
  }
) as <T extends BaseItemColumn>(
  props: PropsWithoutRef<DataGridProps<T>> & RefAttributes<DataGridRef<T>>
) => React.ReactElement;

export default DataGrid;