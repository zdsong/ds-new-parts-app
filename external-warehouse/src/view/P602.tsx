import React, { useEffect, useState } from 'react';

import { SimpleForm, required } from 'react-admin';
import { useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx, formSx } from '../styles/commonSX';

/**
 * ロケ番新規登録画面（P602）
 *
 * 画面イメージ：⑤ロケ番マスタ 2. 新規にロケーション番号を登録する
 */

/** 登録フォームの内容 */
interface LocationForm {
    whCd: string;
    locCd: string;
    memo: string;
}

/** コンボボックスの選択肢 */
interface OptionItem {
    key: string;
    value: string;
}

/** 初期値 */
const INITIAL_FORM: LocationForm = {
    whCd: '',
    locCd: '',
    memo: '',
};

/**
 * 選択値を文字列に正規化する
 * （選択コンポーネントは選択肢オブジェクトを返す場合があるため）
 */
const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

const P602: React.FC = () => {
    const navigate = useNavigate();
    const { request } = useApiRequest();
    const isNarrow = useMediaQuery('(max-width: 900px)');

    // フォーム再描画用の世代番号
    const [formVersion, setFormVersion] = useState<number>(0);
    // 倉庫コンボボックス
    const [warehouseChoices, setWarehouseChoices] = useState<OptionItem[]>([]);

    /** 倉庫コンボボックスを取得する */
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const response = await request('get', 'api/common/wh/options', {}, {}, false, false);
                setWarehouseChoices(response?.data || []);
            } catch (error) {
                setWarehouseChoices([]);
            }
        };
        fetchWarehouses();
    }, []);

    /** 登録処理 */
    const handleSubmit = async (values: any) => {
        try {
            const response = await request('post', 'api/master/location', {
                whCd: normalizeChoiceValue(values?.whCd),
                locCd: (values?.locCd || '').trim(),
                memo: values?.memo || '',
            });
            if (response?.code >= 200 && response?.code < 300) {
                navigate('/P601');
            }
        } catch (error) {
            // エラー通知は API 呼び出し側で表示する
        }
    };

    /** 入力内容をクリアする */
    const handleClear = () => {
        setFormVersion((version) => version + 1);
    };

    /** 一覧画面へ戻る */
    const handleBack = () => {
        navigate('/P601');
    };

    return (
        <PageContainer title={'ロケ番新規登録'} titleUnderline bottomSpace>
            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="ロケ番情報" border={false}>
                <SimpleForm
                    key={formVersion}
                    id="p602-form"
                    sx={formSx.formContainer}
                    onSubmit={handleSubmit}
                    toolbar={false}
                    defaultValues={INITIAL_FORM}
                >
                    <div
                        style={{
                            ...formSx.form2,
                            gridTemplateColumns: isNarrow ? '1fr' : '5fr 5fr',
                        }}
                    >
                        <FormInput
                            type={'filter-select'}
                            source="whCd"
                            label="倉庫"
                            choices={warehouseChoices}
                            placeholder="選択してください"
                            validate={[required()]}
                            required
                        />
                        <FormInput
                            type={'text'}
                            source="locCd"
                            label="ロケ番"
                            placeholder="入力してください"
                            validate={[required()]}
                            required
                        />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormInput
                                type={'text'}
                                source="memo"
                                label="コメント"
                                multiline
                                placeholder="入力してください"
                                sx={{
                                    height: 'auto',
                                    minHeight: '90px',
                                    alignItems: 'flex-start',
                                    input: {
                                        '& .MuiInputBase-root': {
                                            height: 'auto',
                                            minHeight: '80px',
                                            paddingTop: '4px',
                                            paddingBottom: '4px',
                                        },
                                        '& .MuiInputBase-input': { paddingTop: '2px', paddingBottom: '2px' },
                                        '& textarea': { minHeight: '70px' },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            {/* 操作ボタン（左：戻る・クリア／右：登録） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button style={buttonSx.backButton} type="button" onClick={handleBack}>
                        戻る
                    </button>
                    <button style={buttonSx.button} type="button" onClick={handleClear}>
                        クリア
                    </button>
                </div>
                <button style={buttonSx.button} type="submit" form="p602-form">
                    登録
                </button>
            </div>
        </PageContainer>
    );
};

export default P602;
