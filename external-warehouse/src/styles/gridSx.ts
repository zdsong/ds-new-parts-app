import { CSSProperties } from 'react';
import { BaseItemColumn } from '../compontent/DataGrid';
import { ColDef, GridOptions } from 'ag-grid-community';

export const gridStyles = `
  .ag-theme-alpine {
    --ag-border-color: transparent !important;
    --ag-row-border-color: transparent !important;
    --ag-header-border-color: transparent !important;
    --ag-selected-row-border-color: transparent !important;
    border: none !important;
    font-family: "Meiryo", sans-serif;
  }

  .ag-theme-alpine .ag-header-container {
    background-color: var(--mui-page-header-color);
    font-weight: bold !important;
    font-size: 14px !important;
  }
  .ag-theme-alpine .ag-header-row {
    color: #ffffff !important;
  }

  .ag-center-cols-viewport {
    min-height: 350px !important;
  }

  .ag-theme-alpine .ag-header-cell {
    border-right: 1px solid #ffffff !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .ag-theme-alpine .ag-cell {
    font-size: 14px !important;
    color: #333333 !important;
    padding: 4px 8px !important;
    display: flex !important;
    align-items: center !important;
    border-right: 1px solid #C6C6C6;
  }

  .ag-theme-alpine .ag-cell[style*="text-align: right"] {
    justify-content: flex-end !important;
  }
  .ag-theme-alpine .ag-cell[style*="text-align: center"] {
    justify-content: center !important;
  }
  .ag-theme-alpine .ag-cell[style*="text-align: left"] {
    justify-content: flex-start !important;
  }

  .ag-theme-alpine .ag-row-even {
    background-color: #f9f9f9 !important;
  }

  .ag-theme-alpine .ag-row-selected,
  .ag-theme-alpine .ag-row-hover {
    background-color: transparent !important;
    border: 1 solid #00b441 !important;
  }
  .ag-theme-alpine .ag-cell.ew-cell-has-input {
    padding: 3px 6px !important;
  }
  .ag-theme-alpine .ew-cell-editor {
    width: 100%;
    height: 26px;
    box-sizing: border-box;
    border: 1px solid #9e9e9e;
    border-radius: 0;
    background: #ffffff;
    padding: 0 6px;
    font-size: 14px;
    color: #333333;
    font-family: "Meiryo", sans-serif;
    outline: none;
  }
  .ag-theme-alpine .ew-cell-editor:focus {
    border-color: #00b441;
  }
  .ag-theme-alpine .ew-cell-editor-number {
    text-align: right;
  }

  /* 編集テーブルは一覧と区別する。列の縦線を外し、ヘッダーは白地に濃い文字にする */
  .ew-editing-grid .ag-header,
  .ew-editing-grid .ag-header-viewport,
  .ew-editing-grid .ag-header-container,
  .ew-editing-grid .ag-header-row {
    background-color: #ffffff !important;
    color: #333333 !important;
    border-bottom: 1px solid #d0d0d0;
  }
  .ew-editing-grid .ag-header-cell,
  .ew-editing-grid .ag-header-cell-label,
  .ew-editing-grid .ag-header-cell-text {
    background-color: #ffffff !important;
    color: #333333 !important;
    border-right: none !important;
  }
  .ew-editing-grid .ag-cell {
    border-right: none !important;
  }

  .ag-theme-alpine .ag-cell-focus,
  .ag-theme-alpine .ag-cell-focus-outline {
    outline: none !important;
    border: 1px solid #00b441 !important; 
  }

  /* 編集テーブルは選択時の緑枠と、表の上・左・右の外枠を出さない */
  .ew-editing-grid .ag-root-wrapper,
  .ew-editing-grid .ag-root,
  .ew-editing-grid .ag-header {
    border-top: none !important;
    border-left: none !important;
    border-right: none !important;
  }
  .ew-editing-grid .ag-cell-focus,
  .ew-editing-grid .ag-cell-focus-outline,
  .ew-editing-grid .ag-cell-range-selected,
  .ew-editing-grid .ag-row-selected,
  .ew-editing-grid .ag-row-hover,
  .ew-editing-grid .ag-row-focus {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }
  .ag-theme-alpine .ew-editing-grid .ew-cell-editor:focus {
    border-color: #9e9e9e;
  }
`;


export const AG_GRID_THEME = 'ag-theme-alpine';

export const gridContainerBaseStyle: CSSProperties = {
  height: '100%',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
};

export const paginationContainerStyle: CSSProperties = {
  padding: '5px',
  display: 'flex',
  justifyContent: 'right',
};

export const radioButtonStyle: CSSProperties = {
  width: '16px',
  height: '16px',
  cursor: 'pointer',
  appearance: 'radio',
  WebkitAppearance: 'radio',
  accentColor: '#1976d2',
};

export const radioWrapperStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: '100%',
};

export const getSelectionColumnStyles = (
    selectionMode: 'single' | 'multiple' | 'none',
  ): Pick<ColDef, 'width' | 'maxWidth'> => {
    if (selectionMode === 'none') {
      return { width: 0, maxWidth: 0 };
    }
    return { width: 80, maxWidth: 80 };
  };

export const getGridBaseOptions = <T extends BaseItemColumn>(
    rowHeight: number,
    selectionMode: 'single' | 'multiple' | 'none',
  ): Pick<GridOptions<T>, 'rowHeight' | 'suppressRowClickSelection' | 'rowSelection' | 'headerHeight'> => ({
    rowHeight,
    suppressRowClickSelection: selectionMode !== 'multiple',
    rowSelection: selectionMode === 'multiple' ? 'multiple' : 'single',
    headerHeight: 40,
  });

export const columnBaseStyle = {
  suppressMovable: true,
  suppressSorting: true,
  suppressFilter: true,
};