import React, { useEffect } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { Box, Typography, CircularProgress } from '@mui/material';
import { Button, LoginFormClasses, SimpleForm, required, useNotify, useTranslate } from 'react-admin';
import LabelInput from '../compontent/LabelInput';
import LoginShell, { FLUID, fluidInputSx, fluidLoginButtonSx } from '../compontent/LoginShell';
import { useNavigate, useParams } from 'react-router';
import { authProvider } from '../adapters/authProvider';
import { font } from '../styles/commonSX';
import { HOME_ROUTE } from '../utils/appRoutes';


const P003 = () => {


    const [loading, setLoading] = React.useState(false);
    const notify = useNotify();
    const translate = useTranslate();
    const navigate = useNavigate()

    const { type } = useParams<{ type: string }>()

    useEffect(() => {
        const tempToken = sessionStorage.getItem('externalWarehouseToken')

        if(tempToken){
            navigate(HOME_ROUTE)
        }
    }, []);

    const submitVerify = async (values: any) => {
        setLoading(true)
        try{
           const response = await authProvider.login(values)
            if(type === 'login'){
                await authProvider.checkAuth(response.data)
                navigateHome()
            }else if(type === 'reset-password'){
                navigateP004()
            }
        }catch(e){
            if(e instanceof Error){
                notify(e.message, { type: 'error' })
            }
        }
        setLoading(false)
    };

    const submitResendCode = async () => {
        setLoading(true)
        try{
            await authProvider.resendCode()
            notify(translate('ra.message.send_success'), { type: 'success' })
        }catch(e){
            if(e instanceof Error){
                notify(e.message, { type: 'error' })
            }
        }
        setLoading(false)
    };

    const navigateHome = () =>{
        navigate(HOME_ROUTE)
    }

    const navigateP004 = () =>{
        navigate('/P004')
    }



    return (
        <LoginShell subtitle="メールでお送りした認証コードを入力してください">
            <SimpleForm
            toolbar={false}
            onSubmit={submitVerify}
            defaultValues={{verifyCode: '' }}
            mode="onSubmit"
            reValidateMode="onChange"
            // カード内側の余白（MUI CardContent 既定）は外して幅を外枠側で管理する
            sx={{ width: '100%', padding: '0' }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: FLUID.fieldGap,
                        width: '100%',
                    }}
                >

                <LabelInput
                source="verifyCode"
                label="認証コード"
                type="text"
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
                    <Button
                        variant="contained"
                        disabled={loading}
                        sx={fluidLoginButtonSx}
                        type="submit"
                    >
                        {loading ? (
                            <CircularProgress
                                className={LoginFormClasses.icon}
                                size={19}
                                thickness={3}
                                sx={{ color: 'white' }}
                            />
                        ) :
                            '認証'
                        }
                    </Button>

                    <Typography
                        variant='body1'
                        component="h2"
                        gutterBottom
                        fontWeight='600'
                        sx={{ ...font.loginLinkFont, fontSize: FLUID.inputFont }}
                        onClick={submitResendCode}
                    >
                        認証コードを再送信する
                    </Typography>
                </Box>
            </SimpleForm>
        </LoginShell>
    );
};

export default P003;
