import React, { useMemo, forwardRef, useImperativeHandle, PropsWithoutRef, RefAttributes, useState, useCallback, useEffect } from 'react';
import { ColDef, GridReadyEvent, CheckboxSelectionCallbackParams, GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useAgGridPagination } from '../adapters/gridUtil';
import { tableSx } from '../styles/commonSX';

// 親コンポーネントに暴露するメソッドインターフェース
export interface UniversalDataGridRef<T> {
  search: (searchParams: Record<string, any>) => void;
  postSearch: (searchParams: Record<string, any>) => void;
  refresh: () => void;
  getSelectedRows: () => T[];
}

// コンポーネント設定インターフェース
export interface UniversalDataGridConfig<T> {
  resource: string;
  searchMethod?: 'get' | 'post'
  columnDefs: ColDef<T>[];
  defaultFilter?: Record<string, any>;
  defaultPagination?: { pageNum: number; pageSize: number };
  defaultSort?: { field: string; order: 'ASC' | 'DESC' };
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
  gridOptions?: any;
  selectionMode?: 'single' | 'multiple' | 'none'; 
  headerHeight?: number;
  rowUniqueKey?: keyof T;
  pagination?: boolean;
}

// 汎用AgGridコンポーネント
export const UniversalDataGrid = forwardRef(
  function <T extends Record<string, any>>(
    props: UniversalDataGridConfig<T>,
    ref: React.Ref<UniversalDataGridRef<T>>
  ) {
    const {
      resource,
      searchMethod = 'get',
      columnDefs,
      defaultFilter = {},
      defaultPagination = { pageNum: 1, pageSize: 20 },
      defaultSort,
      onSuccess,
      onError,
      gridOptions = {},
      selectionMode = 'none',
      headerHeight = 30,
      pagination = true,
      rowUniqueKey = 'id', // 行の一意識別子（デフォルト: id）
    } = props;

    // Grid API保存
    const [gridApi, setGridApi] = useState<GridApi<T> | null>(null);
    // 単一選択時の選択行
    const [selectedRow, setSelectedRow] = useState<T | null>(null);

    // ページネーションHook使用
    const { rows, total, dataSource, onPaginationChanged, onSortChanged, search, postSearch, refresh } = useAgGridPagination<T>({
      resource,
      searchMethod,
      defaultFilter,
      defaultPagination,
      defaultSort,
      onSuccess,
      onError,
      pagination,
    });

    // 選択列設定（field不要で実装）
    const selectionColumn: ColDef<T> = useMemo(() => {
      // 選択なしモード：列を非表示
      if (selectionMode === 'none') {
        return {
          width: 0,
          suppressMovable: true,
          suppressSorting: true,
          suppressFilter: true,
          hide: true,
        };
      }

      // 複数選択モード：原生チェックボックス
      if (selectionMode === 'multiple') {
        return {
          headerName: '選択',
          width: 80,
          maxWidth: 80,
          suppressMovable: true,
          suppressSorting: true,
          suppressFilter: true,
          checkboxSelection: (params: CheckboxSelectionCallbackParams<T>) => true,
          valueGetter: () => null, // fieldを設定しない
        };
      }

      // 単一選択モード：カスタムラジオボタン
      return {
        headerName: '選択',
        width: 80,
        maxWidth: 80,
        suppressMovable: true,
        suppressSorting: true,
        suppressFilter: true,
        cellRenderer: ({ data }: { data: T }) => (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <input
              type="radio"
              checked={selectedRow?.[rowUniqueKey] === data[rowUniqueKey]}
              onChange={() => setSelectedRow(data)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer',
                appearance: 'radio',
                WebkitAppearance: 'radio',
                accentColor: '#1976d2',
              }}
            />
          </div>
        ),
        valueGetter: () => null, // fieldを設定しない
      };
    }, [selectionMode, selectedRow, rowUniqueKey]);

    // 選択列 + 業務列をマージ
    const memoizedColumnDefs = useMemo<ColDef<T>[]>(
      () => [selectionColumn, ...columnDefs],
      [selectionColumn, columnDefs]
    );

    // デフォルト列設定
    const defaultColDef = useMemo<ColDef<T>>(() => ({
      resizable: true,
      filter: true,
      sortable: true,
      minWidth: 100,
      width: 120,
      headerHeight: headerHeight,
    }), [headerHeight]);

    // Gridデータソース設定
    const setGridDataSource = useCallback(() => {
      if (gridApi && dataSource) {
        gridApi.setGridOption('datasource', dataSource);
        gridApi.setRowCount(total)
      }
    }, [gridApi, dataSource]); 

    // Grid初期化処理
    const onGridReady = useCallback((event: GridReadyEvent<T>) => {
      setGridApi(event.api);

      const fitColumns = () => {
        if (gridApi) {
          gridApi.sizeColumnsToFit();
        }
      };
      setTimeout(fitColumns, 0);
      window.addEventListener('resize', fitColumns);
  
      // クリーンアップ処理
      return () => {
        window.removeEventListener('resize', fitColumns);
        setGridApi(null);
      };
    }, [setGridDataSource]); 

    // データソース更新時にGridを更新
    useEffect(() => {
      if (gridApi && total > 0) {
        setGridDataSource();
      }
    }, [dataSource]);

    // 選択行取得（単一/複数選択対応）
    const getSelectedRows = (): T[] => {
      if (selectionMode === 'single') {
        return selectedRow ? [selectedRow] : [];
      }
      if (selectionMode === 'multiple') {
        return gridApi?.getSelectedRows() || [];
      }
      return [];
    };

    // 親コンポーネントにメソッドを暴露
    useImperativeHandle(
      ref,
      () => ({ search, refresh, postSearch,getSelectedRows }),
      [search, refresh, getSelectedRows, selectedRow]
    );

    // Grid設定をマージ
    const mergedGridOptions = useMemo(() => ({
      ...gridOptions,
      headerHeight: headerHeight,
      rowHeight: 35,
      suppressRowClickSelection: selectionMode !== 'multiple',
      rowSelection: selectionMode === 'multiple' ? 'multiple' : 'single',
      suppressHorizontalScroll: true,
    }), [gridOptions, headerHeight, selectionMode]);

    return (
      <div className="ag-theme-alpine" style={tableSx.tableContainer}>
        <AgGridReact<T>
          columnDefs={memoizedColumnDefs}
          rowData={rows}
          defaultColDef={defaultColDef}
          rowModelType={'clientSide'}
          gridOptions={mergedGridOptions}
          pagination={pagination}
          paginationPageSize={defaultPagination.pageSize}
          paginationPageSizeSelector={[1,5,20,50,100]}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onSortChanged={onSortChanged}
          suppressPaginationPanel={false}
          suppressRowClickSelection={true}
          onSelectionChanged={getSelectedRows}
        />
      </div>
    );
  }
) as <T extends Record<string, any>>(
  props: PropsWithoutRef<UniversalDataGridConfig<T>> & RefAttributes<UniversalDataGridRef<T>>
) => React.ReactElement;