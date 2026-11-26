import React, { useEffect, useState } from 'react';

import { SimpleForm, required, useNotify } from 'react-admin';
import { useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx, formSx } from '../styles/commonSX';

/**
 * ユーザー倉庫関係の新規登録（P605）
 *
 * ロケ番新規登録と同じ画面構成で、ユーザー・倉庫・関係タイプを登録する。
 */

/** コンボボックスの選択肢 */
interface OptionItem {
    key: string;
    value: string;
}

/** 初期値 */
const INITIAL_FORM = {
    userName: '',
    whCd: '',
    relationTypes: [] as string[],
};

/**
 * 選択値を文字列に正規化する
 */
const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

/** チェックボックスの選択値を文字列配列にする */
const toTypeList = (value: any): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeChoiceValue(item)).filter((item) => item !== '');
    }
    if (typeof value === 'string' && value.trim() !== '') {
        return value.split(',').map((item) => item.trim()).filter((item) => item !== '');
    }
    return [];
};

const choiceSx = {
    height: 'auto',
    input: {
        height: 'auto',
        '& .MuiFormGroup-root': {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '12px',
            height: 'auto',
        },
    },
};

const P605: React.FC = () => {
    const navigate = useNavigate();
    const { request } = useApiRequest();
    const notify = useNotify();
    const isNarrow = useMediaQuery('(max-width: 900px)');

    const [formVersion, setFormVersion] = useState<number>(0);
    const [warehouseChoices, setWarehouseChoices] = useState<OptionItem[]>([]);
    const [userChoices, setUserChoices] = useState<OptionItem[]>([]);
    const [relationTypeOptions, setRelationTypeOptions] = useState<OptionItem[]>([]);

    /** ユーザー・倉庫・関係タイプの選択肢を取得する */
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [relationTypes, users, warehouses] = await Promise.all([
                    request('post', 'api/common/options', { cmdOptionName: 'bss_user_relation_type' }, {}, false, false),
                    request('get', 'api/master/userRelation/users', {}, {}, false, false),
                    request('get', 'api/master/userRelation/warehouses', {}, {}, false, false),
                ]);
                setRelationTypeOptions(relationTypes?.data || []);
                setUserChoices(users?.data || []);
                setWarehouseChoices(warehouses?.data || []);
                setFormVersion((version) => version + 1);
            } catch (error) {
                setRelationTypeOptions([]);
                setUserChoices([]);
                setWarehouseChoices([]);
            }
        };
        fetchOptions();
    }, []);

    /** 登録する。同じユーザーと倉庫が既にある場合はサーバーが拒否する */
    const handleSubmit = async (values: any) => {
        const userName = normalizeChoiceValue(values?.userName);
        const whCd = normalizeChoiceValue(values?.whCd);
        const relationTypes = toTypeList(values?.relationTypes);
        if (!userName) {
            notify('notify.userRelation.select_user', { type: 'warning' });
            return;
        }
        if (!whCd) {
            notify('notify.userRelation.select_warehouse', { type: 'warning' });
            return;
        }
        if (relationTypes.length === 0) {
            notify('notify.userRelation.select_type', { type: 'warning' });
            return;
        }
        try {
            const response = await request('post', 'api/master/userRelation', {
                userName,
                whCd,
                relationTypes,
                typeRows: [],
            });
            if (response?.code >= 200 && response?.code < 300) {
                navigate('/P604');
            }
        } catch (error) {
            // エラー通知は API 呼び出し側で表示する
        }
    };

    return (
        <PageContainer title={'ユーザー倉庫関係新規登録'} titleUnderline bottomSpace>
            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="ユーザー倉庫関係" border={false}>
                <SimpleForm
                    key={formVersion}
                    id="p605-form"
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
                            source="userName"
                            label="ユーザー"
                            choices={userChoices}
                            placeholder="選択してください"
                            validate={[required()]}
                            required
                        />
                        <FormInput
                            type={'filter-select'}
                            source="whCd"
                            label="倉庫"
                            choices={warehouseChoices}
                            placeholder="選択してください"
                            validate={[required()]}
                            required
                        />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormInput
                                type={'multiple-choice'}
                                source="relationTypes"
                                label="関係タイプ"
                                choices={relationTypeOptions}
                                sx={choiceSx}
                                required
                            />
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            <div style={buttonSx.formActionBar}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button style={buttonSx.backButton} type="button" onClick={() => navigate('/P604')}>
                        戻る
                    </button>
                    <button style={buttonSx.button} type="button" onClick={() => setFormVersion((version) => version + 1)}>
                        クリア
                    </button>
                </div>
                <button style={buttonSx.button} type="submit" form="p605-form">
                    登録
                </button>
            </div>
        </PageContainer>
    );
};

export default P605;
