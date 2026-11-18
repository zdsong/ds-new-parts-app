import React from 'react';
import { spSx } from '../styles/spSx';

/**
 * SP 画面のページ送り
 *
 * 設計書「①パレット番号管理 3.1 積載部品の登録」のページ番号に合わせた、
 * 方枠のページ番号ボタン。現在のページだけ青地・白文字にし、それ以外は白地・青枠にする。
 * ページ数が多いときは「・・・」で省略し、先頭と末尾のページは常に表示する。
 */
interface SpPaginationProps {
    /** 現在のページ（1 始まり） */
    page: number;
    /** 総ページ数 */
    totalPage: number;
    /** ページを変更する */
    onChange: (page: number) => void;
    /** 表示するページ番号の最大数（省略記号を除く） */
    maxButtons?: number;
}

/** 省略記号を表す内部値 */
const ELLIPSIS = 'ellipsis' as const;

type PageItem = number | typeof ELLIPSIS;

/**
 * 表示するページ番号を組み立てる
 *
 * 例：全 10 ページで 1 ページ目を表示 → 1 2 3 4 5 ・・・ 10
 *     全 10 ページで 7 ページ目を表示 → 1 ・・・ 6 7 8 ・・・ 10
 */
export const buildPageItems = (
    page: number,
    totalPage: number,
    maxButtons = 5
): PageItem[] => {
    // 全ページが収まる場合はすべて表示する
    if (totalPage <= maxButtons + 2) {
        return Array.from({ length: totalPage }, (_, index) => index + 1);
    }

    // 表示するページ番号の数（先頭・末尾のページを含む）
    const windowSize = Math.max(3, maxButtons - 2);
    // 先頭側・末尾側に確保するページ数
    const sideSize = Math.floor(windowSize / 2);

    // 先頭寄りのページを表示している場合
    if (page <= maxButtons - 2) {
        const head = Array.from({ length: maxButtons }, (_, index) => index + 1);
        return [...head, ELLIPSIS, totalPage];
    }

    // 末尾寄りのページを表示している場合
    if (page >= totalPage - (maxButtons - 3)) {
        const tail = Array.from(
            { length: maxButtons },
            (_, index) => totalPage - maxButtons + 1 + index
        );
        return [1, ELLIPSIS, ...tail];
    }

    // 中間のページを表示している場合（現在のページを中央に置く）
    const middle = Array.from(
        { length: windowSize },
        (_, index) => page - sideSize + index
    ).filter((value) => value > 1 && value < totalPage);

    return [1, ELLIPSIS, ...middle, ELLIPSIS, totalPage];
};

const SpPagination: React.FC<SpPaginationProps> = ({
    page,
    totalPage,
    onChange,
    maxButtons = 5,
}) => {
    if (totalPage <= 1) return null;

    const items = buildPageItems(page, totalPage, maxButtons);

    return (
        <div style={spSx.pagination}>
            {items.map((item, index) =>
                item === ELLIPSIS ? (
                    <span key={`ellipsis-${index}`} style={spSx.paginationEllipsis}>
                        ・・・
                    </span>
                ) : (
                    <button
                        key={item}
                        type="button"
                        style={
                            item === page
                                ? { ...spSx.paginationButton, ...spSx.paginationButtonActive }
                                : spSx.paginationButton
                        }
                        aria-current={item === page ? 'page' : undefined}
                        aria-label={`${item}ページ目`}
                        onClick={() => {
                            if (item !== page) onChange(item);
                        }}
                    >
                        {item}
                    </button>
                )
            )}
        </div>
    );
};

export default SpPagination;
