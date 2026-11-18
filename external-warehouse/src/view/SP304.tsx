import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import SpPagination from '../compontent/SpPagination';
import useApiRequest from '../adapters/apiUtil';
import { spFormInputSx, spSx } from '../styles/spSx';
import { CATEGORY_LABELS, fromApiPallet, normalizeChoiceValue } from '../utils/palletData';
import type { ApiPallet, OptionItem, PalletRow } from '../utils/palletData';

/**
 * パレット番号一覧画面（SP304）
 *
 * 設計書：①パレット番号管理 3.4 パレット番号一覧
 *   検索条件でパレットを絞り込み、パレット番号をタップすると情報詳細（SP305）へ遷移する。
 *   一覧は GET /api/pallet/list から取得する（ページングはサーバ側で行う）。
 *   番号表の印刷はパレット情報詳細（SP305）で行うため、この画面には印刷ボタンを置かない。
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
    const { request } = useApiRequest();

    // 検索条件（確定値）
    const [condition, setCondition] = useState<SearchCondition>(INITIAL_CONDITION);
    // フォーム再描画用の世代番号（クリア時に使用）
    const [formKey, setFormKey] = useState(0);
    // 現在のページ
    const [page, setPage] = useState(1);

    // 一覧（API から取得する）
    const [rows, setRows] = useState<PalletRow[]>([]);
    // 総件数
    const [total, setTotal] = useState(0);

    // 倉庫・ロケ番の選択肢
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [locationOptions, setLocationOptions] = useState<OptionItem[]>([]);
    // 検索条件で選択中の倉庫（ロケ番の選択肢の絞り込みに使用する）
    const [formWhCd, setFormWhCd] = useState('');

    /** 保管倉庫の選択肢を取得する */
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const result = await request('get', 'api/common/wh/options', {}, {}, false, false);
                setWarehouseOptions(result?.data || []);
            } catch (error) {
                console.error(error);
            }
        };
        fetchWarehouses();
    }, []);

    /** 保管倉庫に紐づくロケ番の選択肢を取得する */
    useEffect(() => {
        const fetchLocations = async () => {
            if (!formWhCd) {
                setLocationOptions([]);
                return;
            }
            try {
                const result = await request(
                    'get',
                    `api/common/${formWhCd}/location/options`,
                    {},
                    {},
                    false,
                    false
                );
                setLocationOptions(result?.data || []);
            } catch (error) {
                console.error(error);
            }
        };
        fetchLocations();
    }, [formWhCd]);

    /** 検索条件に一致するパレット一覧を取得する */
    useEffect(() => {
        const fetchPallets = async () => {
            try {
                const result = await request(
                    'get',
                    'api/pallet/list',
                    {
                        whCd: condition.storageLocation,
                        locCd: condition.locationNo,
                        palletNo: condition.palletNo,
                        itemCode: condition.itemCode,
                        itemName: condition.itemName,
                    },
                    { current: page, pageSize: PAGE_SIZE },
                    false,
                    false
                );
                const apiRows: ApiPallet[] = result?.rows || [];
                setRows(apiRows.map((row) => fromApiPallet(row).row));
                setTotal(result?.total || 0);
            } catch (error) {
                console.error(error);
            }
        };
        fetchPallets();
    }, [condition, page]);

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
    };

    /** 検索条件をクリアする */
    const handleClear = () => {
        setCondition(INITIAL_CONDITION);
        setFormKey((key) => key + 1);
        setFormWhCd('');
        setPage(1);
    };

    /** パレット情報詳細（SP305）へ遷移する */
    const handleOpenDetail = (pallet: PalletRow) => {
        navigate('/SP305', { state: { palletNo: pallet.palletNo } });
    };

    const totalPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const startNo = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endNo = Math.min(page * PAGE_SIZE, total);

    return (
        <Box sx={spSx.page}>
            {/* タイトルバー */}
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>パレット番号一覧</label>
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
                            choices={warehouseOptions}
                            onChange={(value) => setFormWhCd(normalizeChoiceValue(value))}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="locationNo"
                            label="ロケーション番号"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            choices={locationOptions}
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
                <span>{`■検索結果：${total}件`}</span>
                <span style={{ color: '#5f5f5f', fontSize: '12px' }}>
                    {`${startNo} - ${endNo} 件を表示`}
                </span>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rows.length === 0 ? (
                    <div style={spSx.empty}>該当するパレットがありません。</div>
                ) : (
                    rows.map((pallet) => (
                        <div key={pallet.palletNo} style={spSx.itemCard}>
                            <div style={spSx.itemHeader}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
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
                                    {`${pallet.storageLocationName || '－'} / ${pallet.locationNo}`}
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

            {/* ページ送り（設計書 3.1 のページ番号の枠） */}
            <SpPagination page={page} totalPage={totalPage} onChange={setPage} />
        </Box>
    );
};

export default SP304;
