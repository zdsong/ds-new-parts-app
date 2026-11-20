import React, { useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { MenuItem, Select, Typography } from '@mui/material';
import { ColDef } from 'ag-grid-community';

import DataGrid from './DataGrid';
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

export interface ResultGridProps<T extends { id: string | number }> {
    columnDefs: ColDef<T>[];
    /** 絞り込み済みの全行。ページ分割はコンポーネント側で行う */
    rowData: T[];
    rowUniqueKey?: keyof T;
    rowHeight?: number;
    noRowsShow?: string;
    /** 検索結果：N件 と 表示範囲 */
    showResultSummary?: boolean;
    /** 表示件数 */
    showPageSize?: boolean;
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
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
}

const DEFAULT_PAGE_SIZE_CHOICES = [10, 20, 50];

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

const ResultGrid = <T extends { id: string | number }>({
    columnDefs,
    rowData,
    rowUniqueKey = 'id' as keyof T,
    rowHeight = 38,
    noRowsShow = '該当するデータがありません。',
    showResultSummary = false,
    showPageSize = false,
    pageSizeChoices = DEFAULT_PAGE_SIZE_CHOICES,
    showTopPagination = false,
    showBottomPagination = false,
    bottomLeft,
    page,
    pageSize,
    defaultPageSize = 10,
    onPageChange,
    onPageSizeChange,
}: ResultGridProps<T>): React.ReactElement => {
    const paging = showPageSize || showTopPagination || showBottomPagination;
    const [innerPage, setInnerPage] = useState(1);
    const [innerPageSize, setInnerPageSize] = useState(defaultPageSize);

    const currentSize = pageSize ?? innerPageSize;
    const total = rowData.length;
    const totalPages = paging ? Math.max(1, Math.ceil(total / currentSize) || 1) : 1;
    const requestedPage = page ?? innerPage;
    const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);

    const pageRows = paging
        ? rowData.slice((currentPage - 1) * currentSize, currentPage * currentSize)
        : rowData;
    const rangeStart = total === 0 ? 0 : paging ? (currentPage - 1) * currentSize + 1 : 1;
    const rangeEnd = paging ? Math.min(currentPage * currentSize, total) : total;

    const changePage = (next: number) => {
        const clamped = Math.min(Math.max(next, 1), totalPages);
        if (page === undefined) setInnerPage(clamped);
        onPageChange?.(clamped);
    };

    const changePageSize = (next: number) => {
        if (pageSize === undefined) setInnerPageSize(next);
        if (page === undefined) setInnerPage(1);
        onPageSizeChange?.(next);
        onPageChange?.(1);
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
                    columnDefs={columnDefs}
                    rowData={pageRows}
                    page={currentPage}
                    pageSize={currentSize}
                    rowTotal={total}
                    onPageChange={(current) => changePage(current)}
                    rowUniqueKey={rowUniqueKey}
                    selectionMode="none"
                    rowHeight={rowHeight}
                    noRowsShow={noRowsShow}
                />
            </div>
            <style>{`
                .result-grid .ag-center-cols-viewport,
                .result-grid .ag-center-cols-clipper {
                    min-height: 0 !important;
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
};

export default ResultGrid;
