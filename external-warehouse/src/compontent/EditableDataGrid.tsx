import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  PropsWithoutRef,
  RefAttributes,
} from 'react';
import { CellValueChangedEvent, ColDef, GridApi } from 'ag-grid-community';

import DataGrid, { BaseItemColumn } from './DataGrid';

/**
 * テーブル内編集（インライン編集）対応の DataGrid 拡張。
 *
 * 既存の DataGrid は「表示専用」として 15 画面で使われているため、
 * そちらの既定挙動は変えず、編集に必要な指定だけをここで組み立てる。
 * 追加したのは以下 3 点のみ。
 *   1. 列定義に `editable` / `cellEditor` / `valueSetter` を組み立てる
 *   2. 変更行（ダーティ）と入力エラーの見た目を cellClassRules で付ける
 *   3. 行追加・行削除・変更取消を ref 経由で提供する
 *
 * AG Grid Community 版で動作する（セル編集・6 種のエディタ・Ctrl+Z は Community の範囲）。
 * なお範囲コピー＆貼り付け（Clipboard）は Enterprise 相当のため本構成では使えない。
 */

/** 列に指定できる編集種別 */
export type EditableEditorType = 'text' | 'number' | 'select' | 'date';

export interface EditableOption {
  value: string | number;
  label: string;
}

/** 編集情報を足した列定義 */
export interface EditableColumn<T> extends ColDef<T> {
  /** 指定した列だけ編集可能になる。未指定＝参照専用 */
  editorType?: EditableEditorType;
  /** editorType='select' のときの選択肢 */
  options?: EditableOption[];
  /** 数値の下限（editorType='number'） */
  min?: number;
  /** 数値の上限（editorType='number'） */
  max?: number;
  /** 整数のみ許可（editorType='number'） */
  integer?: boolean;
  /** 必須項目。未入力ならエラー表示 */
  required?: boolean;
}

/** 入力エラー 1 件 */
export interface EditableCellError {
  rowId: string;
  field: string;
  headerName: string;
  message: string;
}

/** 変更履歴 1 件 */
export interface EditableChange {
  rowId: string;
  field: string;
  headerName: string;
  before: unknown;
  after: unknown;
  /** 変更後の行データ（同一参照）。ここを書き換えると画面にも反映される */
  row: Record<string, any>;
}

export interface EditableDataGridRef<T extends BaseItemColumn> {
  /** 行を 1 件追加する */
  addRow: () => void;
  /** 選択中の行を削除する */
  removeSelectedRows: () => void;
  /** すべての変更を破棄して初期状態に戻す */
  revertAll: () => void;
  /** 現在の行データ（編集結果を含む） */
  getRows: () => T[];
  /** 変更のあった行だけを返す */
  getChangedRows: () => T[];
  /** 現在の入力エラー一覧 */
  getErrors: () => EditableCellError[];
  /** 編集を確定する */
  stopEditing: () => void;
}

export interface EditableDataGridProps<T extends BaseItemColumn> {
  /** 編集情報付きの列定義 */
  columns: EditableColumn<T>[];
  /** 初期行データ */
  initialRows: T[];
  /** 新規行を 1 件生成する（一意な id を必ず入れること） */
  createRow: () => T;
  /** 行の一意キー。既定は 'id' */
  rowUniqueKey?: keyof T;
  /** 行単位の入力チェック。フィールド名 → エラーメッセージを返す */
  validateRow?: (row: T, rows: T[]) => Record<string, string>;
  /** 行データが変わるたびに呼ばれる */
  onRowsChange?: (rows: T[]) => void;
  /** ダーティ行数・エラー数が変わるたびに呼ばれる */
  onChangeSummary?: (summary: {
    changedCount: number;
    errorCount: number;
    errors: EditableCellError[];
  }) => void;
  /** セル値が変わるたびに呼ばれる（変更前後の値つき） */
  onCellChange?: (change: EditableChange) => void;
  /** 選択行が変わるたびに呼ばれる */
  onSelectionChange?: (rows: T[]) => void;
  /** 行の高さ。既定 38 */
  rowHeight?: number;
  /** 選択方式。既定は複数選択（行削除のため） */
  selectionMode?: 'single' | 'multiple' | 'none';
}

/** 変更前スナップショット（行 id → JSON 文字列） */
type Snapshot = Record<string, string>;

const CLASS_DIRTY = 'ew-cell-dirty';
const CLASS_INVALID = 'ew-cell-invalid';
const CLASS_EDITABLE = 'ew-cell-editable';

/** 行の値をまとめて JSON 化する（変更検知用。列順の揺れを避けるためキーをソートする） */
const toJson = (row: Record<string, unknown>): string =>
  JSON.stringify(
    Object.keys(row)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = row[key];
        return acc;
      }, {})
  );

const buildSnapshot = <T extends BaseItemColumn>(rows: T[], key: keyof T): Snapshot =>
  rows.reduce<Snapshot>((acc, row) => {
    acc[String(row[key])] = toJson(row as unknown as Record<string, unknown>);
    return acc;
  }, {});

/**
 * 1 列分の編集設定を組み立てる。
 * 既存の cellEditor / valueGetter / valueSetter が指定されている場合はそちらを優先する。
 */
const buildEditableColumn = <T extends BaseItemColumn>(
  column: EditableColumn<T>
): ColDef<T> => {
  const {
    editorType,
    options,
    min,
    max,
    integer,
    required,
    ...rest
  } = column;

  if (!editorType) {
    return rest as ColDef<T>;
  }

  const def: ColDef<T> = {
    ...rest,
    editable: rest.editable ?? true,
    // 1 クリックで編集開始（ダブルクリックを強いない）
    singleClickEdit: rest.singleClickEdit ?? true,
  };

  // 必須項目はヘッダーに「*」を付けて分かるようにする
  if (required && typeof rest.headerName === 'string' && !rest.headerName.endsWith('*')) {
    def.headerName = `${rest.headerName} *`;
  }

  switch (editorType) {
    case 'number':
      def.cellEditor = rest.cellEditor ?? 'agNumberCellEditor';
      def.cellEditorParams = rest.cellEditorParams ?? {
        min,
        max,
        precision: integer ? 0 : undefined,
      };
      break;
    case 'select':
      def.cellEditor = rest.cellEditor ?? 'agSelectCellEditor';
      def.cellEditorParams = rest.cellEditorParams ?? {
        values: (options ?? []).map((option) => option.label),
      };
      // 内部値と表示ラベルが違う場合のみ変換する
      if (options && options.length > 0 && !rest.valueGetter) {
        const labelOf = (value: unknown) =>
          options.find((option) => option.value === value)?.label ?? (value as string);
        def.valueGetter = (params) => labelOf(params.data?.[rest.field as keyof T]);
      }
      if (options && options.length > 0 && !rest.valueSetter) {
        const valueOf = (label: unknown) =>
          options.find((option) => option.label === label)?.value ?? label;
        def.valueSetter = (params) => {
          const next = valueOf(params.newValue);
          if (params.data && params.data[rest.field as keyof T] === next) {
            return false;
          }
          if (params.data) {
            (params.data as Record<string, unknown>)[rest.field as string] = next;
          }
          return true;
        };
      }
      break;
    case 'date':
      // yyyy-mm-dd の文字列で保持する。表示だけ yyyy/MM/dd にしたい場合は
      // 呼び出し側で valueFormatter を指定する。
      def.cellEditor = rest.cellEditor ?? 'agDateStringCellEditor';
      break;
    case 'text':
    default:
      def.cellEditor = rest.cellEditor ?? 'agTextCellEditor';
      break;
  }

  // 必須チェックの見た目（赤枠）は行の再計算時に cellClassRules で付けるため、
  // ここでは列ごとの設定だけを組み立てる。
  return def;
};

const EditableDataGridInner = <T extends BaseItemColumn>(
  props: EditableDataGridProps<T>,
  ref: React.Ref<EditableDataGridRef<T>>
) => {
  const {
    columns,
    initialRows,
    createRow,
    rowUniqueKey = 'id',
    validateRow,
    onRowsChange,
    onChangeSummary,
    onCellChange,
    onSelectionChange,
    rowHeight = 38,
    selectionMode = 'multiple',
  } = props;

  const [rows, setRows] = useState<T[]>(initialRows);
  const rowsRef = useRef<T[]>(initialRows);
  const apiRef = useRef<GridApi<T> | null>(null);

  /** 初期値スナップショット（変更検知と取消に使う） */
  const snapshotRef = useRef<Snapshot>(buildSnapshot(initialRows, rowUniqueKey));
  /** ダーティ行 id */
  const dirtyRef = useRef<Set<string>>(new Set());
  /** 入力エラー（行 id → フィールド → メッセージ） */
  const errorRef = useRef<Record<string, Record<string, string>>>({});
  /** 変更履歴 */
  const changeLogRef = useRef<EditableChange[]>([]);
  /** 選択行 id */
  const selectedIdsRef = useRef<string[]>([]);

  const [changedCount, setChangedCount] = useState(0);
  const [errors, setErrors] = useState<EditableCellError[]>([]);

  const keyOf = useCallback(
    (row: T) => String(row[rowUniqueKey]),
    [rowUniqueKey]
  );

  const fieldHeader = useMemo(() => {
    const map: Record<string, string> = {};
    columns.forEach((column) => {
      if (column.field) {
        map[column.field as string] = (column.headerName as string) ?? (column.field as string);
      }
    });
    return map;
  }, [columns]);

  /** 再計算：ダーティ判定・入力チェック・状態列の更新・再描画 */
  const recalculate = useCallback(() => {
    const dirty = new Set<string>();
    rowsRef.current.forEach((row) => {
      const id = keyOf(row);
      const json = toJson(row as unknown as Record<string, unknown>);
      if (!snapshotRef.current[id] || snapshotRef.current[id] !== json) {
        dirty.add(id);
      }
    });
    dirtyRef.current = dirty;

    // 入力チェック
    const nextErrors: Record<string, Record<string, string>> = {};
    rowsRef.current.forEach((row) => {
      const messages = validateRow ? validateRow(row, rowsRef.current) : {};
      if (messages && Object.keys(messages).length > 0) {
        nextErrors[keyOf(row)] = messages;
      }
    });
    errorRef.current = nextErrors;

    const errorList: EditableCellError[] = [];
    Object.entries(nextErrors).forEach(([rowId, fields]) => {
      Object.entries(fields).forEach(([field, message]) => {
        errorList.push({
          rowId,
          field,
          headerName: fieldHeader[field] ?? field,
          message,
        });
      });
    });

    setChangedCount(dirty.size);
    setErrors(errorList);
    onChangeSummary?.({
      changedCount: dirty.size,
      errorCount: errorList.length,
      errors: errorList,
    });

    // cellClassRules は再評価が必要なので強制再描画する
    apiRef.current?.refreshCells({ force: true });
  }, [keyOf, validateRow, onChangeSummary, fieldHeader]);

  /** 行配列を差し替えて React 側にも通知する */
  const commitRows = useCallback(
    (next: T[]) => {
      rowsRef.current = next;
      setRows(next);
      recalculate();
      onRowsChange?.(next.slice());
    },
    [recalculate, onRowsChange]
  );

  /** セル値変更 */
  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<T>) => {
      const field = event.colDef.field;
      if (!field || !event.data) {
        return;
      }
      const id = keyOf(event.data);
      changeLogRef.current = [
        ...changeLogRef.current,
        {
          rowId: id,
          field,
          headerName: fieldHeader[field] ?? field,
          before: event.oldValue,
          after: event.newValue,
          row: event.data as unknown as Record<string, any>,
        },
      ];
      onCellChange?.({
        rowId: id,
        field,
        headerName: fieldHeader[field] ?? field,
        before: event.oldValue,
        after: event.newValue,
        row: event.data as unknown as Record<string, any>,
      });
      recalculate();
      onRowsChange?.(rowsRef.current.slice());
      // 呼び出し側が onCellChange で他のセルを書き換えることがあるため、
      // 次のフレームでもう一度再計算して表示を追従させる。
      requestAnimationFrame(() => recalculate());
    },
    [keyOf, recalculate, onCellChange, onRowsChange, fieldHeader]
  );

  // 初回マウント時に一度だけ状態を整える
  useEffect(() => {
    recalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 行追加 */
  const addRow = useCallback(() => {
    const row = createRow();
    const next = [...rowsRef.current, row];
    commitRows(next);
    requestAnimationFrame(() => {
      apiRef.current?.ensureIndexVisible(next.length - 1);
    });
  }, [createRow, commitRows]);

  /** 選択行削除 */
  const removeSelectedRows = useCallback(() => {
    if (selectedIdsRef.current.length === 0) {
      return;
    }
    const removeIds = new Set(selectedIdsRef.current);
    const next = rowsRef.current.filter((row) => !removeIds.has(keyOf(row)));
    // 削除した行の変更履歴は残さない
    changeLogRef.current = changeLogRef.current.filter(
      (change) => !removeIds.has(change.rowId)
    );
    selectedIdsRef.current = [];
    apiRef.current?.deselectAll();
    commitRows(next);
  }, [keyOf, commitRows]);

  /**
   * すべての変更を破棄して初期状態に戻す。
   * 追加した行は消え、削除した行は元の位置に復元される。
   */
  const revertAll = useCallback(() => {
    const restored = Object.values(snapshotRef.current).map(
      (json) => JSON.parse(json) as T
    );
    changeLogRef.current = [];
    selectedIdsRef.current = [];
    apiRef.current?.deselectAll();
    commitRows(restored);
  }, [commitRows]);

  const getChangedRows = useCallback(
    () => rowsRef.current.filter((row) => dirtyRef.current.has(keyOf(row))),
    [keyOf]
  );

  useImperativeHandle(
    ref,
    () => ({
      addRow,
      removeSelectedRows,
      revertAll,
      getRows: () => rowsRef.current.slice(),
      getChangedRows,
      getErrors: () => errors,
      stopEditing: () => apiRef.current?.stopEditing(),
    }),
    [addRow, removeSelectedRows, revertAll, getChangedRows, errors]
  );

  /** 列定義の組み立て（編集設定 + 状態に応じた見た目） */
  const columnDefs = useMemo<ColDef<T>[]>(
    () =>
      columns.map((column) => {
        const def = buildEditableColumn(column);
        const field = column.field;

        if (!field) {
          return def;
        }

        const rowIdOf = (data: T) => String(data[rowUniqueKey]);

        return {
          ...def,
          cellClassRules: {
            ...(def.cellClassRules ?? {}),
            // 編集可能セルはホバーで色を変える
            ...(column.editorType ? { [CLASS_EDITABLE]: () => true } : {}),
            // 変更済みセル
            [CLASS_DIRTY]: (params) =>
              Boolean(params.data) && dirtyRef.current.has(rowIdOf(params.data as T)),
            // 入力エラーセル
            [CLASS_INVALID]: (params) =>
              Boolean(params.data) &&
              Boolean(errorRef.current[rowIdOf(params.data as T)]?.[field as string]),
          },
        };
      }),
    [columns, rowUniqueKey]
  );

  return (
    // 既存画面と同じく、DataGrid は ag-theme-alpine クラスの配下に置く必要がある
    // （gridSx のヘッダー色・罫線の指定がこのクラス基準で書かれているため）
    <div className="ag-theme-alpine ew-editable-grid" style={{ width: '100%' }}>
      {/* 編集用の見た目。DataGrid 側が <style> を出すのと同じ方式で当てる */}
      <style>{EDITABLE_GRID_STYLES}</style>
      <DataGrid<T>
        columnDefs={columnDefs}
        rowData={rows}
        page={1}
        onPageChange={() => undefined}
        rowHeight={rowHeight}
        selectionMode={selectionMode}
        rowUniqueKey={rowUniqueKey}
        editing
        onCellValueChanged={handleCellValueChanged}
        onSelectionChange={(selected) => {
          selectedIdsRef.current = selected.map((row) => keyOf(row));
          onSelectionChange?.(selected);
        }}
        onApiReady={(api) => {
          apiRef.current = api;
        }}
        gridContainerStyle={{ height: 'auto' }}
      />
    </div>
  );
};

/** 編集用のスタイル（スコープは .ew-editable-grid 配下に限定する） */
const EDITABLE_GRID_STYLES = `
  /* 明細編集用のグリッドは行数に合わせて高さを詰める
     （gridSx の min-height:350px は一覧画面向けの指定のため、ここでは解除する） */
  .ew-editable-grid .ag-center-cols-viewport,
  .ew-editable-grid .ag-center-cols-clipper {
    min-height: 0 !important;
  }
  .ew-editable-grid .ag-cell.${CLASS_EDITABLE} {
    cursor: text;
  }
  .ew-editable-grid .ag-cell.${CLASS_EDITABLE}:hover {
    background-color: #fffde7;
  }
  .ew-editable-grid .ag-cell.${CLASS_DIRTY} {
    background-color: #e6f4ea;
  }
  .ew-editable-grid .ag-cell.${CLASS_INVALID} {
    background-color: #ffebee !important;
    box-shadow: inset 0 0 0 1px #d32f2f;
  }
  .ew-editable-grid .ag-cell.${CLASS_INVALID}::before {
    content: '!';
    position: absolute;
    right: 2px;
    top: 0;
    font-size: 10px;
    font-weight: 700;
    color: #d32f2f;
  }
  /* 編集中はセル内の余白を詰めてエディタを広く使う */
  .ew-editable-grid .ag-cell-inline-editing {
    padding: 0 !important;
    display: flex !important;
    align-items: stretch !important;
  }
  .ew-editable-grid .ag-cell-inline-editing .ag-cell-edit-wrapper,
  .ew-editable-grid .ag-cell-inline-editing .ag-input-field {
    width: 100%;
    height: 100%;
  }
  .ew-editable-grid .ag-cell-inline-editing input,
  .ew-editable-grid .ag-cell-inline-editing select {
    height: 100%;
    font-size: 14px;
    padding: 0 6px;
    border: none;
    outline: none;
    background: #ffffff;
  }
  .ew-editable-grid .ag-cell-focus {
    border: 2px solid #00b441 !important;
  }
`;

/**
 * 型引数を保ったまま使えるようにするためのエクスポート。
 * 使い方：`<EditableDataGrid<MyRow> ref={ref} columns={...} ... />`
 */
const EditableDataGrid = forwardRef(EditableDataGridInner) as <
  T extends BaseItemColumn
>(
  props: PropsWithoutRef<EditableDataGridProps<T>> &
    RefAttributes<EditableDataGridRef<T>>
) => React.ReactElement;

export default EditableDataGrid;
