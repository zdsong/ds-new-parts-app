import React, { useEffect, useState } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Button, SimpleForm, required, useNotify, useTranslate } from 'react-admin';
import LabelInput from '../compontent/LabelInput';
import LoginShell, { FLUID, fluidInputSx, fluidLoginButtonSx } from '../compontent/LoginShell';
import { useNavigate } from 'react-router-dom';

import {authProvider} from '../adapters/authProvider'
import { font } from '../styles/commonSX'
import { HOME_ROUTE } from '../utils/appRoutes'

interface LoginPageDatas {

}

const N001: React.FC<LoginPageDatas> = () => {
    const [loading, setLoading] = useState(false);
    const notify = useNotify();

    const navigate = useNavigate()
    const translate = useTranslate();


    useEffect(() => {
        const tempToken = sessionStorage.getItem('externalWarehouseToken')

        if(tempToken){
            navigate(HOME_ROUTE)
        }
    }, []);


    const submitLogin = async (values: any) => {

        setLoading(true)
        try{
            await authProvider.logSend(values)
            notify(translate('ra.message.send_success'), { type: 'success' })
            navigateP003()
        }catch(e){
            if(e instanceof Error){
                notify(e.message, { type: 'error' })
            }
        }
        setLoading(false)

    };

    const navigateP003 = () =>{
        navigate('/login/verify/login')
    }

    // 直接ログイン（ユーザーID/パスワード検証 + トークン検証）
    const submitDirectLogin = async (values: any) => {

        setLoading(true)
        try{
            await authProvider.directLogin(values)
            navigate(HOME_ROUTE)
        }catch(e){
            if(e instanceof Error){
                notify(e.message, { type: 'error' })
            }
        }
        setLoading(false)

    };

    const navigateP002 = () =>{
        navigate('/login/send-email')
    }

    return (
        <LoginShell>
            <SimpleForm
                toolbar={false}
                onSubmit={submitDirectLogin}
                defaultValues={{ username: '', password: '' }}
                mode="onSubmit"
                reValidateMode="onChange"
                // カード内側の余白（MUI CardContent 既定）は外して幅を外枠側で管理する
                sx={{ width: '100%', padding: '0' }}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FLUID.fieldGap,
                    width: '100%',
                }}>
                    <LabelInput
                        source="username"
                        label="ユーザID"
                        type="text"
                        validate={[required()]}
                        sx={fluidInputSx}
                    />

                    <LabelInput
                        source="password"
                        label="パスワード"
                        type="password"
                        validate={[required()]}
                        sx={fluidInputSx}
                    />
                </div>

                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    marginTop: FLUID.actionMarginTop,
                    flexDirection: 'column',
                    gap: '10px',
                }}>
                    <Box sx={{ display: 'none' }}>
                        <Button
                            variant="contained"
                            disabled={loading}
                            sx={fluidLoginButtonSx}
                            type="submit"
                        >
                            {loading ? (
                                <CircularProgress size={19} thickness={3} sx={{ color: 'white' }} />
                            ) : '認証コードを送信'}
                        </Button>
                    </Box>

                    <Button
                        variant="contained"
                        disabled={loading}
                        sx={fluidLoginButtonSx}
                        type="submit"
                    >
                        {loading ? (
                            <CircularProgress size={19} thickness={3} sx={{ color: 'white' }} />
                        ) : 'ログイン'}
                    </Button>

                    <Typography
                        variant='body1'
                        component="span"
                        fontWeight='600'
                        sx={{ ...font.loginLinkFont, fontSize: FLUID.inputFont }}
                        onClick={()=>{navigateP002()}}
                    >
                        パスワードを忘れた方はこちら
                    </Typography>
                </Box>
            </SimpleForm>
        </LoginShell>
    );
};

export default N001;
