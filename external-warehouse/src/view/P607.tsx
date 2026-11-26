import React, { useEffect, useMemo, useState } from 'react';

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
 * ユーザー倉庫関係の一括設定（P607）
 *
 * 一覧で選んだ複数件に、同じ関係タイプを設定する。
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

const P607: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { request } = useApiRequest();
    const notify = useNotify();
    const isNarrow = useMediaQuery('(max-width: 900px)');

    const rows = (location.state as { rows?: RelationRow[] } | null)?.rows || [];
    const [formVersion, setFormVersion] = useState<number>(0);
    const [relationTypeOptions, setRelationTypeOptions] = useState<OptionItem[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

    const warehouseName = useMemo(() => {
        const names = Array.from(new Set(rows.map((row) => row.whNm).filter((name) => name)));
        if (names.length === 1) {
            return names[0];
        }
        return names.length > 1 ? '複数の倉庫' : '';
    }, [rows]);

    /** 対象が無い場合は一覧へ戻す */
    useEffect(() => {
        if (rows.length === 0) {
            navigate('/P604');
        }
    }, [rows.length, navigate]);

    /** 関係タイプの選択肢を取得する */
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const response = await request('post', 'api/common/options', { cmdOptionName: 'bss_user_relation_type' }, {}, false, false);
                setRelationTypeOptions(response?.data || []);
                setFormVersion((version) => version + 1);
            } catch (error) {
                setRelationTypeOptions([]);
            }
        };
        fetchOptions();
    }, []);

    /** 選択行へ同じ関係タイプを設定する */
    const handleSubmit = async (values: any) => {
        const relationTypes = toTypeList(values?.relationTypes);
        if (relationTypes.length === 0) {
            notify('notify.userRelation.select_type', { type: 'warning' });
            return;
        }
        try {
            const response = await request('post', 'api/master/userRelation/batch', {
                relationTypes,
                targets: rows.map((row) => ({
                    userName: row.userName,
                    whCd: row.whCd,
                    typeRows: row.typeRows,
                })),
            });
            if (response?.code >= 200 && response?.code < 300) {
                navigate('/P604');
            }
        } catch (error) {
            // エラー通知は API 呼び出し側で表示する
        }
    };

    /** 選択行を削除する */
    const handleConfirmDelete = async () => {
        try {
            const response = await request('post', 'api/master/userRelation/delete', rows.map((row) => ({
                userName: row.userName,
                whCd: row.whCd,
                typeRows: row.typeRows,
            })));
            setDeleteDialogOpen(false);
            if (response?.code >= 200 && response?.code < 300) {
                navigate('/P604');
            }
        } catch (error) {
            setDeleteDialogOpen(false);
        }
    };

    if (rows.length === 0) {
        return null;
    }

    return (
        <PageContainer title={'ユーザー倉庫関係一括設定'} titleUnderline bottomSpace>
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
                    id="p607-form"
                    sx={formSx.formContainer}
                    onSubmit={handleSubmit}
                    toolbar={false}
                    defaultValues={{
                        targetCount: `${rows.length}件`,
                        whNm: warehouseName,
                        relationTypes: [],
                    }}
                >
                    <div
                        style={{
                            ...formSx.form2,
                            gridTemplateColumns: isNarrow ? '1fr' : '5fr 5fr',
                        }}
                    >
                        <FormInput type={'text'} source="targetCount" label="対象" readOnly />
                        <FormInput type={'text'} source="whNm" label="倉庫" readOnly />
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
                <button style={buttonSx.backButton} type="button" onClick={() => navigate('/P604')}>
                    戻る
                </button>
                <button style={buttonSx.button} type="submit" form="p607-form">
                    設定
                </button>
            </div>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>削除の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {`選択した${rows.length}件のユーザー倉庫関係を削除しますか？`}
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

export default P607;
