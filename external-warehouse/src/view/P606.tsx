import React, { useEffect, useState } from 'react';

import { SimpleForm, useNotify } from 'react-admin';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    useMediaQuery,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx, formSx } from '../styles/commonSX';
import { RelationRow } from './P604';

/**
 * ユーザー倉庫関係の更新（P606）
 *
 * ロケ番更新と同じ画面構成で、関係タイプの変更と削除を行う。
 */

/** コンボボックスの選択肢 */
interface OptionItem {
    key: string;
    value: string;
}

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

const P606: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { request } = useApiRequest();
    const notify = useNotify();
    const isNarrow = useMediaQuery('(max-width: 900px)');

    const row = (location.state as { row?: RelationRow } | null)?.row;
    const [formVersion, setFormVersion] = useState<number>(0);
    const [relationTypes, setRelationTypes] = useState<string[]>(row?.relationTypes || []);
    const [userChoices, setUserChoices] = useState<OptionItem[]>([]);
    const [warehouseChoices, setWarehouseChoices] = useState<OptionItem[]>([]);
    const [relationTypeOptions, setRelationTypeOptions] = useState<OptionItem[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

    /** 一覧から対象が渡されていない場合は一覧へ戻す */
    useEffect(() => {
        if (!row?.userName || !row?.whCd) {
            navigate('/P604');
        }
    }, [row, navigate]);

    /** ユーザー・倉庫・関係タイプの選択肢を取得する */
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [types, users, warehouses] = await Promise.all([
                    request('post', 'api/common/options', { cmdOptionName: 'bss_user_relation_type' }, {}, false, false),
                    request('get', 'api/master/userRelation/users', {}, {}, false, false),
                    request('get', 'api/master/userRelation/warehouses', {}, {}, false, false),
                ]);
                setRelationTypeOptions(types?.data || []);
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

    /** 関係タイプを更新する */
    const handleSubmit = async (values: any) => {
        if (!row) return;
        const nextTypes = toTypeList(values?.relationTypes);
        if (nextTypes.length === 0) {
            notify('notify.userRelation.select_type', { type: 'warning' });
            return;
        }
        try {
            const response = await request('post', 'api/master/userRelation', {
                userName: row.userName,
                whCd: row.whCd,
                relationTypes: nextTypes,
                typeRows: row.typeRows,
            });
            if (response?.code >= 200 && response?.code < 300) {
                navigate('/P604');
            }
        } catch (error) {
            // エラー通知は API 呼び出し側で表示する
        }
    };

    /** 関係を削除する */
    const handleConfirmDelete = async () => {
        if (!row) return;
        try {
            const response = await request('post', 'api/master/userRelation/delete', [{
                userName: row.userName,
                whCd: row.whCd,
                typeRows: row.typeRows,
            }]);
            setDeleteDialogOpen(false);
            if (response?.code >= 200 && response?.code < 300) {
                navigate('/P604');
            }
        } catch (error) {
            setDeleteDialogOpen(false);
        }
    };

    if (!row) {
        return null;
    }

    return (
        <PageContainer title={'ユーザー倉庫関係更新'} titleUnderline bottomSpace>
            <CustomCard
                plain
                sx={{ width: '100%' }}
                titleVariant={'body1'}
                title="ユーザー倉庫関係"
                border={false}
                action={
                    <button
                        style={{
                            ...buttonSx.button,
                            marginRight: '10px',
                            backgroundColor: '#000000',
                            color: '#FFFFFF',
                        }}
                        type="button"
                        onClick={() => setDeleteDialogOpen(true)}
                    >
                        削除
                    </button>
                }
            >
                <SimpleForm
                    key={formVersion}
                    id="p606-form"
                    sx={formSx.formContainer}
                    onSubmit={handleSubmit}
                    toolbar={false}
                    defaultValues={{
                        userName: row.userName,
                        whCd: row.whCd,
                        relationTypes,
                    }}
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
                            disabled
                        />
                        <FormInput
                            type={'filter-select'}
                            source="whCd"
                            label="倉庫"
                            choices={warehouseChoices}
                            disabled
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
                    <button
                        style={buttonSx.button}
                        type="button"
                        onClick={() => {
                            setRelationTypes(row.relationTypes || []);
                            setFormVersion((version) => version + 1);
                        }}
                    >
                        クリア
                    </button>
                </div>
                <button style={buttonSx.button} type="submit" form="p606-form">
                    更新
                </button>
            </div>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>削除の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {`ユーザー「${row.nickName || ''}」と倉庫「${row.whNm || ''}」の関係を削除しますか？`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
                        キャンセル
                    </Button>
                    <Button onClick={handleConfirmDelete} color="primary" autoFocus>
                        確定
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};

export default P606;
