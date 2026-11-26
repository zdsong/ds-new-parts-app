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
  RowStyle,
  CellValueChangedEvent,
  CellClickedEvent,
  ICellRendererParams
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
export interface DataGridProps<T extends BaseItemColumn> {
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
  /** false のとき、行のクリックでは選択しない（チェック欄だけ） */
  selectOnRowClick?: boolean;
  rowUniqueKey?: keyof T;
  onSelectionChange?: (selectedRows: T[]) => void;
  pagination?: boolean;
  noRowsShow?: string;
  pinnedBottomRowData?: any;
  sortable?: boolean;
  getRowStyle?: (params: RowClassParams<T, any>) => RowStyle | undefined;

  /**
   * セル編集モード。
   * 既定は false（＝従来どおり参照専用）。true にすると
   * ・suppressCellFocus を解除してセルにフォーカスを当てられるようにする
   * ・セルからフォーカスが外れたら編集を確定する
   * ・Ctrl/Cmd+Z によるセル編集の取り消しを有効にする
   * を行う。列側で `editable: true` を指定した列だけが編集可能になる。
   */
  editing?: boolean;
  /** 編集確定方式。singleCell＝セル単位（既定）／fullRow＝行単位でまとめて編集 */
  editType?: 'singleCell' | 'fullRow';
  /** セル値が変更されたときに呼ばれる（編集・api.setValue の両方が対象） */
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => void;
  /** セルクリック時に呼ばれる */
  onCellClicked?: (event: CellClickedEvent<T>) => void;
  /** GridApi を受け取る。編集開始・確定・再描画などを親から制御したい場合に使う */
  onApiReady?: (api: GridApi<T>) => void;
}

type EditorKind = 'number' | 'select' | 'date' | 'text';

/** 列に指定されたセルエディタから、常時表示する入力欄の種類を決める */
const editorKindOf = (cellEditor: ColDef['cellEditor']): EditorKind => {
  if (cellEditor === 'agNumberCellEditor') return 'number';
  if (cellEditor === 'agSelectCellEditor') return 'select';
  if (cellEditor === 'agDateStringCellEditor') return 'date';
  return 'text';
};

/**
 * 編集列を、クリックしなくても入力欄が見えるセルにする。
 * 値の確定はフォーカスが外れたとき（選択欄は変更したとき）に行う。
 */
const AlwaysVisibleEditor = (params: ICellRendererParams & { alwaysEdit?: ColDef['editable'] }) => {
  const kind = editorKindOf(params.colDef?.cellEditor);
  const flag = params.alwaysEdit;
  const canEdit = typeof flag === 'function' ? Boolean(flag(params as never)) : Boolean(flag);
  const [draft, setDraft] = useState(params.value ?? '');

  useEffect(() => {
    setDraft(params.value ?? '');
  }, [params.value]);

  if (!canEdit || params.node?.rowPinned) {
    return <span>{params.valueFormatted ?? params.value ?? ''}</span>;
  }

  const editorParams = (params.colDef?.cellEditorParams ?? {}) as {
    min?: number;
    max?: number;
    values?: string[];
  };

  const commit = (raw: string) => {
    const field = params.colDef?.field;
    if (!field || !params.node) return;
    let next: unknown = raw;
    if (kind === 'number') {
      if (raw.trim() === '') {
        next = 0;
      } else {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          setDraft(params.value ?? '');
          return;
        }
        next = parsed;
        if (editorParams.min !== undefined && parsed < editorParams.min) next = editorParams.min;
        if (editorParams.max !== undefined && parsed > editorParams.max) next = editorParams.max;
      }
    }
    if (String(params.value ?? '') === String(next ?? '')) return;
    params.node.setDataValue(field, next);
  };

  const stopGrid = (event: React.MouseEvent) => event.stopPropagation();

  if (kind === 'select') {
    const values = editorParams.values ?? [];
    return (
      <select
        className="ew-cell-editor"
        value={draft === null || draft === undefined ? '' : String(draft)}
        onMouseDown={stopGrid}
        onClick={stopGrid}
        onChange={(event) => {
          setDraft(event.target.value);
          commit(event.target.value);
        }}
      >
        {values.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      className={kind === 'number' ? 'ew-cell-editor ew-cell-editor-number' : 'ew-cell-editor'}
      type={kind === 'date' ? 'date' : 'text'}
      inputMode={kind === 'number' ? 'decimal' : undefined}
      value={draft === null || draft === undefined ? '' : String(draft)}
      onMouseDown={stopGrid}
      onClick={stopGrid}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit((event.target as HTMLInputElement).value);
        }
      }}
    />
  );
};

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
      selectOnRowClick = true,
      rowUniqueKey = 'id',
      onSelectionChange,
      pagination = false,
      noRowsShow = '該当するデータはありません。',
      pinnedBottomRowData,
      sortable = false,
      getRowStyle,
      editing = false,
      editType = 'singleCell',
      onCellValueChanged,
      onCellClicked,
      onApiReady
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
      onApiReady?.(params.api as GridApi<T>);
    }, [enableDebug, onApiReady]);

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
          // 見出しのチェックで、表示中の行をまとめて選ぶ
          headerCheckboxSelection: true,
          headerCheckboxSelectionCurrentPageOnly: true,
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

          // 編集列はクリック前から入力欄を出しておく。独自の cellRenderer がある列は触らない。
          if (mergedCol.editable && !mergedCol.cellRenderer) {
            const sourceEditable = mergedCol.editable;
            const previousClass = mergedCol.cellClass;
            mergedCol.cellRenderer = AlwaysVisibleEditor;
            mergedCol.cellRendererParams = {
              ...(mergedCol.cellRendererParams ?? {}),
              alwaysEdit: sourceEditable,
            };
            mergedCol.editable = false;
            mergedCol.singleClickEdit = false;
            mergedCol.cellClass = (params) => {
              const base = typeof previousClass === 'function' ? previousClass(params) : previousClass;
              const list = Array.isArray(base)
                ? base
                : base
                  ? String(base).split(' ').filter(Boolean)
                  : [];
              return [...list, 'ew-cell-has-input'];
            };
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
        // 行クリックでは選ばない。チェック欄だけが選択になる
        ...(selectOnRowClick === false ? { suppressRowClickSelection: true } : {}),
        suppressColumnMove: true,
        suppressDragLeaveHidesColumns: true,
        // 編集モードのみ有効にするオプション群。
        // 参照専用の既存画面の挙動を変えないよう、editing=false では一切指定しない。
        ...(editing
          ? {
              stopEditingWhenCellsLoseFocus: true,
              enterNavigatesVertically: true,
              enterNavigatesVerticallyAfterEdit: true,
              undoRedoCellEditing: true,
              undoRedoCellEditingLimit: 30,
              editType,
            }
          : {}),
      }),
    [rowHeight, selectionMode, selectOnRowClick, editing, editType]);

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
      <div className={editing ? 'ew-editing-grid' : undefined} style={mergedContainerStyle}>
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
          // 参照専用のときは従来どおりセルフォーカスを抑止する。
          // 抑止したままだと編集（ダブルクリック／Enter）が開始できないため、編集モードでは解除する。
          suppressCellFocus={!editing}
          overlayNoRowsTemplate={noRowsTemplate}
          onCellValueChanged={onCellValueChanged}
          onCellClicked={onCellClicked}
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