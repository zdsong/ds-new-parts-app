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
    background-color: var(--mui-yamato-page-header-color);
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
  .ag-theme-alpine .ag-cell-focus,
  .ag-theme-alpine .ag-cell-focus-outline {
    outline: none !important;
    // border: none !important;
    border: 1px solid #00b441 !important; 
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