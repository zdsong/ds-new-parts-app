import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { MenuItem, Select, Typography } from '@mui/material';
import { CellClickedEvent, CellValueChangedEvent, ColDef } from 'ag-grid-community';

import DataGrid, { DataGridRef } from './DataGrid';
import { tableSx } from '../styles/commonSX';

/**
 * 一覧テーブル
 *
 * 既定では表だけを出す。次の表示はそれぞれ独立して付けられる。
 *   ・検索結果（件数と表示範囲）
 *   ・表示件数
 *   ・表の上のページ切替
 *   ・表の下のページ切替
 * ページ切替か表示件数を付けたときだけ、渡された行をページ単位に切る。
 */

/** 表示件数の選択肢。画面側では渡さず、特別な画面だけ pageSizeChoices で上書きする */
export const PAGE_SIZE_CHOICES = [10, 20, 50];

/** 表示件数の初期値 */
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_CHOICES[0];

export interface ResultGridRef<T extends { id: string | number }> {
    getSelectedRows: () => T[];
    clearSelection: () => void;
    getPageSize: () => number;
}

export interface ResultGridProps<T extends { id: string | number }> {
    columnDefs: ColDef<T>[];
    /**
     * 行データ。
     * rowTotal を渡さないときは全行で、ページ分割はコンポーネント側で行う。
     * rowTotal を渡したときは、いま表示するページの行（サーバ側で切った結果）。
     */
    rowData: T[];
    /** サーバ側の総件数。渡したときは rowData を再分割しない */
    rowTotal?: number;
    rowUniqueKey?: keyof T;
    rowHeight?: number;
    noRowsShow?: string;
    /** 検索結果：N件 と 表示範囲 */
    showResultSummary?: boolean;
    /** 表示件数 */
    showPageSize?: boolean;
    /** 未指定時は PAGE_SIZE_CHOICES。特別な画面だけ渡す */
    pageSizeChoices?: number[];
    /** 表の上のページ切替 */
    showTopPagination?: boolean;
    /** 表の下のページ切替 */
    showBottomPagination?: boolean;
    /** 下段の左（戻るボタンなど）。ページ切替は右に置く */
    bottomLeft?: React.ReactNode;
    page?: number;
    pageSize?: number;
    defaultPageSize?: number;
    onPageChange?: (page: number, pageSize: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    selectionMode?: 'single' | 'multiple' | 'none';
    onSelectionChange?: (selectedRows: T[]) => void;
    editing?: boolean;
    editType?: 'singleCell' | 'fullRow';
    onCellValueChanged?: (event: CellValueChangedEvent<T>) => void;
    onCellClicked?: (event: CellClickedEvent<T>) => void;
}

const resultHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '0 0 4px 0',
    gap: '1rem',
};

const resultSummaryStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
};

const pageSizeStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginLeft: 'auto',
};

/** 設計書の << 1 2 3 4 5 ... 20 >> */
const PageLinks: React.FC<{
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
}> = ({ page, totalPages, onChange }) => {
    const items = useMemo(() => {
        if (totalPages <= 0) return [];
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }
        const tokens: Array<number | '...'> = [];
        const push = (value: number | '...') => {
            if (tokens[tokens.length - 1] !== value) tokens.push(value);
        };
        push(1);
        const start = Math.max(2, page - 2);
        const end = Math.min(totalPages - 1, page + 2);
        if (start > 2) push('...');
        for (let current = start; current <= end; current += 1) push(current);
        if (end < totalPages - 1) push('...');
        push(totalPages);
        return tokens;
    }, [page, totalPages]);

    if (totalPages <= 1) return null;

    const link = (label: string, target: number, disabled: boolean, current = false): React.ReactNode => (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(target)}
            style={{
                border: 'none',
                background: 'transparent',
                color: current ? '#0b5cab' : '#1a73c7',
                fontWeight: current ? 700 : 500,
                cursor: disabled ? 'default' : 'pointer',
                padding: '0 4px',
                fontSize: '14px',
            }}
        >
            {label}
        </button>
    );

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '2px' }}>
            {link('<<', 1, page <= 1)}
            {items.map((item, index) =>
                item === '...' ? (
                    <span key={`ellipsis-${index}`} style={{ color: '#1a73c7', padding: '0 4px' }}>
                        ...
                    </span>
                ) : (
                    <span key={item}>{link(String(item), item, false, item === page)}</span>
                )
            )}
            {link('>>', totalPages, page >= totalPages)}
        </div>
    );
};

function ResultGridInner<T extends { id: string | number }>(
    {
        columnDefs,
        rowData,
        rowTotal,
        rowUniqueKey = 'id' as keyof T,
        rowHeight = 38,
        noRowsShow = '該当するデータがありません。',
        showResultSummary = false,
        showPageSize = false,
        pageSizeChoices = PAGE_SIZE_CHOICES,
        showTopPagination = false,
        showBottomPagination = false,
        bottomLeft,
        page,
        pageSize,
        defaultPageSize = DEFAULT_PAGE_SIZE,
        onPageChange,
        onPageSizeChange,
        selectionMode = 'none',
        onSelectionChange,
        editing = false,
        editType = 'singleCell',
        onCellValueChanged,
        onCellClicked,
    }: ResultGridProps<T>,
    ref: React.Ref<ResultGridRef<T>>
): React.ReactElement {
    const gridRef = useRef<DataGridRef<T>>(null);
    const paging = showPageSize || showTopPagination || showBottomPagination;
    const serverPaging = rowTotal !== undefined;
    const [innerPage, setInnerPage] = useState(1);
    const [innerPageSize, setInnerPageSize] = useState(defaultPageSize);

    const currentSize = pageSize ?? innerPageSize;
    const total = serverPaging ? rowTotal : rowData.length;
    const totalPages = paging ? Math.max(1, Math.ceil(total / currentSize) || 1) : 1;
    const requestedPage = page ?? innerPage;
    const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);

    const pageRows = paging && !serverPaging
        ? rowData.slice((currentPage - 1) * currentSize, currentPage * currentSize)
        : rowData;

    useImperativeHandle(ref, () => ({
        getSelectedRows: () => gridRef.current?.getSelectedRows() ?? [],
        clearSelection: () => gridRef.current?.clearSelection(),
        getPageSize: () => currentSize,
    }), [currentSize]);
    const rangeStart = total === 0 ? 0 : paging ? (currentPage - 1) * currentSize + 1 : 1;
    const rangeEnd = paging ? Math.min(currentPage * currentSize, total) : total;

    const changePage = (next: number) => {
        const clamped = Math.min(Math.max(next, 1), totalPages);
        if (page === undefined) setInnerPage(clamped);
        onPageChange?.(clamped, currentSize);
    };

    const changePageSize = (next: number) => {
        if (pageSize === undefined) setInnerPageSize(next);
        if (page === undefined) setInnerPage(1);
        onPageSizeChange?.(next);
        onPageChange?.(1, next);
    };

    const showBottomBar = showBottomPagination || bottomLeft != null;

    return (
        <div>
            {(showResultSummary || showPageSize) && (
                <div style={resultHeaderStyle}>
                    {showResultSummary ? (
                        <div style={resultSummaryStyle}>
                            <Typography variant={'body2'} sx={{ fontSize: 13 }}>
                                検索結果：{total}件
                            </Typography>
                            <Typography variant={'body2'} sx={{ fontSize: 13 }}>
                                {rangeStart}－{rangeEnd}件を表示
                            </Typography>
                        </div>
                    ) : (
                        <span />
                    )}
                    {showPageSize && (
                        <div style={pageSizeStyle}>
                            <Typography variant={'body2'} sx={{ fontSize: 13 }}>
                                表示件数
                            </Typography>
                            <Select
                                size="small"
                                value={currentSize}
                                onChange={(event) => changePageSize(Number(event.target.value))}
                                sx={{ height: 28, minWidth: 64, fontSize: 13, backgroundColor: '#ffffff' }}
                            >
                                {pageSizeChoices.map((size) => (
                                    <MenuItem key={size} value={size} sx={{ fontSize: 13 }}>
                                        {size}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Typography variant={'body2'} sx={{ fontSize: 13 }}>
                                件
                            </Typography>
                        </div>
                    )}
                </div>
            )}

            {showTopPagination && (
                <PageLinks page={currentPage} totalPages={total === 0 ? 0 : totalPages} onChange={changePage} />
            )}

            <div className="ag-theme-alpine result-grid" style={{ ...tableSx.tableContainer, marginTop: '6px' }}>
                <DataGrid<T>
                    ref={gridRef}
                    columnDefs={columnDefs}
                    rowData={pageRows}
                    page={currentPage}
                    pageSize={currentSize}
                    rowTotal={total}
                    onPageChange={(current) => changePage(current)}
                    rowUniqueKey={rowUniqueKey}
                    selectionMode={selectionMode}
                    onSelectionChange={onSelectionChange}
                    rowHeight={rowHeight}
                    noRowsShow={noRowsShow}
                    editing={editing}
                    editType={editType}
                    onCellValueChanged={onCellValueChanged}
                    onCellClicked={onCellClicked}
                />
            </div>
            {/* 行が無いときも1行分の高さを残す */}
            <style>{`
                .result-grid .ag-center-cols-viewport,
                .result-grid .ag-center-cols-clipper {
                    min-height: ${rowHeight}px !important;
                }
                .result-grid .ag-overlay-no-rows-center > div {
                    padding: 0 !important;
                    line-height: ${rowHeight}px;
                }
            `}</style>

            {showBottomBar && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: bottomLeft != null ? 'space-between' : 'flex-end',
                        marginTop: '12px',
                    }}
                >
                    {bottomLeft ?? <span />}
                    {showBottomPagination && (
                        <PageLinks page={currentPage} totalPages={total === 0 ? 0 : totalPages} onChange={changePage} />
                    )}
                </div>
            )}
        </div>
    );
}

const ResultGrid = forwardRef(ResultGridInner) as <T extends { id: string | number }>(
    props: ResultGridProps<T> & React.RefAttributes<ResultGridRef<T>>
) => React.ReactElement;

export default ResultGrid;
