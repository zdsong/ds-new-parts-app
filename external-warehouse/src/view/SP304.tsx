import React, { useMemo, useState } from 'react';
import { Box, Checkbox, Typography } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import { spFormInputSx, spSx } from '../styles/spSx';
import {
    CATEGORY_LABELS,
    LOCATION_CHOICES,
    PALLETS,
    STORAGE_CHOICES,
    STORAGE_LABELS,
    normalizeChoiceValue,
    printPalletLabels,
} from '../utils/palletData';
import type { PalletRow } from '../utils/palletData';

/**
 * パレット番号一覧画面（SP304）
 *
 * 設計書：①パレット番号管理 3.4 パレット番号一覧
 *   検索条件でパレットを絞り込み、パレット番号をタップすると情報詳細（SP305）へ遷移する。
 *   チェックしたパレットは番号表印刷の対象となる。
 */
interface SearchCondition {
    storageLocation: string;
    locationNo: string;
    palletNo: string;
    itemCode: string;
    itemName: string;
}

const INITIAL_CONDITION: SearchCondition = {
    storageLocation: '',
    locationNo: '',
    palletNo: '',
    itemCode: '',
    itemName: '',
};

// 1 ページあたりの表示件数（スマートフォンで見やすい件数にする）
const PAGE_SIZE = 5;

const SP304: React.FC = () => {
    const navigate = useNavigate();
    const notify = useNotify();

    // 検索条件（確定値）
    const [condition, setCondition] = useState<SearchCondition>(INITIAL_CONDITION);
    // フォーム再描画用の世代番号（クリア時に使用）
    const [formKey, setFormKey] = useState(0);
    // 現在のページ
    const [page, setPage] = useState(1);
    // 番号表印刷の対象として選択したパレット
    const [selected, setSelected] = useState<string[]>([]);

    /** 検索条件で絞り込んだ一覧 */
    const filtered = useMemo(() => {
        const palletNo = condition.palletNo.trim();
        const itemCode = condition.itemCode.trim().toLowerCase();
        const itemName = condition.itemName.trim();

        return PALLETS.filter((pallet) => {
            if (condition.storageLocation && pallet.storageLocation !== condition.storageLocation) return false;
            if (condition.locationNo && pallet.locationNo !== condition.locationNo) return false;
            if (palletNo && !pallet.palletNo.includes(palletNo)) return false;
            if (itemCode && !pallet.details.some((detail) => detail.itemCode.toLowerCase().includes(itemCode))) {
                return false;
            }
            if (itemName && !pallet.details.some((detail) => detail.itemName.includes(itemName))) {
                return false;
            }
            return true;
        });
    }, [condition]);

    /** 現在ページの表示行 */
    const pageRows = useMemo(
        () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filtered, page]
    );

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        setCondition({
            storageLocation: normalizeChoiceValue(values?.storageLocation),
            locationNo: normalizeChoiceValue(values?.locationNo),
            palletNo: values?.palletNo || '',
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
        });
        setPage(1);
        setSelected([]);
    };

    /** 検索条件をクリアする */
    const handleClear = () => {
        setCondition(INITIAL_CONDITION);
        setFormKey((key) => key + 1);
        setPage(1);
        setSelected([]);
    };

    /** パレット情報詳細（SP305）へ遷移する */
    const handleOpenDetail = (pallet: PalletRow) => {
        navigate('/SP305', {
            state: {
                pallet: {
                    palletNo: pallet.palletNo,
                    category: pallet.category,
                    storageLocation: pallet.storageLocation,
                    locationNo: pallet.locationNo,
                    remark: pallet.remark,
                },
                details: pallet.details,
            },
        });
    };

    /** チェックの切り替え */
    const handleToggle = (id: string) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
    };

    /** 選択したパレットの番号表を印刷する */
    const handlePrint = () => {
        const targets = filtered.filter((pallet) => selected.includes(pallet.id));
        if (targets.length === 0) {
            notify('番号表を印刷するパレットを選択してください。', { type: 'warning' });
            return;
        }
        const count = printPalletLabels(targets);
        if (count === 0) {
            notify('印刷用ウィンドウを開けませんでした。ポップアップブロックを解除してください。', {
                type: 'warning',
            });
        } else {
            notify(`${count} 枚のパレット番号表を印刷します。`, { type: 'success' });
        }
    };

    const totalPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const startNo = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endNo = Math.min(page * PAGE_SIZE, filtered.length);

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー（右：番号表印刷） */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>パレット番号一覧</label>
                <Typography sx={spSx.actionLink} component="span" onClick={handlePrint}>
                    番号表印刷
                </Typography>
            </Box>

            {/* 検索条件 */}
            <Box sx={spSx.sectionTitle}>■検索条件</Box>
            <Box sx={spSx.card}>
                <SimpleForm
                    key={formKey}
                    sx={{ width: '100%', padding: '0' }}
                    onSubmit={handleSearch}
                    toolbar={false}
                    defaultValues={INITIAL_CONDITION}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <FormInput
                            type={'filter-select'}
                            source="storageLocation"
                            label="倉庫"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={STORAGE_CHOICES}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="locationNo"
                            label="ロケーション番号"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={LOCATION_CHOICES}
                        />
                        <FormInput
                            type={'text'}
                            source="palletNo"
                            label="パレット番号"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="入力してください"
                        />
                        <FormInput
                            type={'text'}
                            source="itemCode"
                            label="品目コード"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="入力してください"
                        />
                        <FormInput
                            type={'text'}
                            source="itemName"
                            label="品目名"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="入力してください"
                        />
                    </div>
                    <div style={spSx.buttonBar}>
                        <button style={spSx.secondaryButton} type="button" onClick={handleClear}>
                            クリア
                        </button>
                        <button style={spSx.primaryButton} type="submit">
                            検索
                        </button>
                    </div>
                </SimpleForm>
            </Box>

            {/* 検索結果 */}
            <Box sx={{ ...spSx.sectionTitle, justifyContent: 'space-between' }}>
                <span>{`■検索結果：${filtered.length}件`}</span>
                <span style={{ color: '#5f5f5f', fontSize: '12px' }}>
                    {`${startNo} - ${endNo} 件を表示`}
                </span>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pageRows.length === 0 ? (
                    <div style={spSx.empty}>該当するパレットがありません。</div>
                ) : (
                    pageRows.map((pallet) => (
                        <div key={pallet.id} style={spSx.itemCard}>
                            <div style={spSx.itemHeader}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                                    <Checkbox
                                        size="small"
                                        checked={selected.includes(pallet.id)}
                                        onChange={() => handleToggle(pallet.id)}
                                        sx={{ padding: '2px' }}
                                    />
                                    <span
                                        style={{
                                            ...spSx.itemTitle,
                                            color: 'var(--mui-page-header-color)',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                        }}
                                        onClick={() => handleOpenDetail(pallet)}
                                    >
                                        {pallet.palletNo}
                                    </span>
                                </Box>
                                <span style={{ ...spSx.link, color: '#5f5f5f', cursor: 'default' }}>
                                    {CATEGORY_LABELS[pallet.category] || '－'}
                                </span>
                            </div>

                            <div style={spSx.row}>
                                <span style={spSx.rowLabel}>保管場所</span>
                                <span style={spSx.rowValue}>
                                    {`${STORAGE_LABELS[pallet.storageLocation] || '－'} / ${pallet.locationNo}`}
                                </span>
                            </div>

                            {/* 品目詳細（積載明細）: コードと品目名を 2 行に分けて読みやすくする */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {pallet.details.map((detail) => (
                                    <div key={detail.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '13px', color: '#212121', wordBreak: 'break-all' }}>
                                            {detail.itemCode}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#5f5f5f' }}>
                                            {`${detail.itemName}（${detail.quantity}）`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </Box>

            {/* ページ送り */}
            {totalPage > 1 && (
                <Box sx={spSx.buttonBar}>
                    <button
                        style={page === 1 ? { ...spSx.secondaryButton, opacity: 0.5 } : spSx.secondaryButton}
                        type="button"
                        disabled={page === 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                        前へ
                    </button>
                    <span style={{ fontSize: '13px', color: '#5f5f5f' }}>{`${page} / ${totalPage}`}</span>
                    <button
                        style={page === totalPage ? { ...spSx.secondaryButton, opacity: 0.5 } : spSx.secondaryButton}
                        type="button"
                        disabled={page === totalPage}
                        onClick={() => setPage((current) => Math.min(totalPage, current + 1))}
                    >
                        次へ
                    </button>
                </Box>
            )}
        </Box>
    );
};

export default SP304;
