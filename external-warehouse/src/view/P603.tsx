import React, { useEffect, useState } from 'react';

import { SimpleForm, required } from 'react-admin';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    useMediaQuery
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx, formSx } from '../styles/commonSX';

/**
 * ロケ番更新画面（P603）
 *
 * 画面イメージ：⑤ロケ番マスタ 3. ロケーション番号を修正・削除する
 */

/** 更新フォームの内容 */
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

const P603: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { request } = useApiRequest();
    const isNarrow = useMediaQuery('(max-width: 900px)');

    // 一覧画面から受け取ったロケーションマスタID
    const locationId: string | undefined = (location.state as any)?.id;

    // フォーム内容と再描画用の世代番号
    const [formData, setFormData] = useState<LocationForm>(INITIAL_FORM);
    const [initialData, setInitialData] = useState<LocationForm>(INITIAL_FORM);
    const [formVersion, setFormVersion] = useState<number>(0);
    // 楽観的排他制御用のバージョン
    const [version, setVersion] = useState<number>(0);
    // 倉庫コンボボックス
    const [warehouseChoices, setWarehouseChoices] = useState<OptionItem[]>([]);
    // 削除確認ダイアログ
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

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

    /** ロケーションマスタの詳細を取得する */
    useEffect(() => {
        if (!locationId) {
            navigate('/P601');
            return;
        }
        const fetchInfo = async () => {
            try {
                const response = await request('get', `api/master/location/info/${locationId}`);
                if (response?.data) {
                    const loaded: LocationForm = {
                        whCd: response.data.whCd || '',
                        locCd: response.data.locCd || '',
                        memo: response.data.memo || '',
                    };
                    setFormData(loaded);
                    setInitialData(loaded);
                    setVersion(response.data.version || 0);
                    setFormVersion((current) => current + 1);
                }
            } catch (error) {
                // エラー通知は API 呼び出し側で表示する
            }
        };
        fetchInfo();
    }, [locationId]);

    /** 更新処理 */
    const handleSubmit = async (values: any) => {
        if (!locationId) return;
        try {
            const response = await request('put', 'api/master/location', {
                id: locationId,
                version,
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

    /** 削除処理 */
    const handleConfirmDelete = async () => {
        if (!locationId) return;
        try {
            const response = await request('post', 'api/master/location/delete', {
                id: locationId,
                version,
            });
            setDeleteDialogOpen(false);
            if (response?.code >= 200 && response?.code < 300) {
                navigate('/P601');
            }
        } catch (error) {
            setDeleteDialogOpen(false);
        }
    };

    /** 入力内容を初期状態に戻す */
    const handleClear = () => {
        setFormData({ ...initialData });
        setFormVersion((current) => current + 1);
    };

    /** 一覧画面へ戻る */
    const handleBack = () => {
        navigate('/P601');
    };

    return (
        <PageContainer title={'ロケ番更新'} titleUnderline bottomSpace>
            <CustomCard plain
                sx={{ width: '100%' }}
                titleVariant={'body1'}
                title="ロケ番情報"
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
                    id="p603-form"
                    sx={formSx.formContainer}
                    onSubmit={handleSubmit}
                    toolbar={false}
                    defaultValues={formData}
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

            {/* 操作ボタン（左：戻る・クリア／右：更新） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button style={buttonSx.button} type="button" onClick={handleBack}>
                        戻る
                    </button>
                    <button style={buttonSx.button} type="button" onClick={handleClear}>
                        クリア
                    </button>
                </div>
                <button style={buttonSx.button} type="submit" form="p603-form">
                    更新
                </button>
            </div>

            {/* 削除確認ダイアログ */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>削除の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {`ロケ番「${formData.locCd || ''}」を削除しますか？`}
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

export default P603;
