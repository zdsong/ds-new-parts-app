import React, { useEffect } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { Box, Typography, CircularProgress } from '@mui/material';
import { Button, LoginFormClasses, SimpleForm, required, useNotify, useTranslate } from 'react-admin';
import  LabelInput from '../compontent/LabelInput';
import LoginShell, { FLUID, fluidInputSx, fluidLoginButtonSx } from '../compontent/LoginShell';

import { useNavigate } from 'react-router-dom';
import { authProvider } from '../adapters/authProvider';
import { font } from '../styles/commonSX';
import { HOME_ROUTE } from '../utils/appRoutes';


const P002 = () => {


    const [loading, setLoading] = React.useState(false);
    const notify = useNotify();
    const translate = useTranslate();
    const navigate = useNavigate()

    useEffect(() => {
        const tempToken = sessionStorage.getItem('externalWarehouseToken')

        if(tempToken){
            navigate(HOME_ROUTE)
        }
    }, []);

    const submitSendMail = async (values: any) => {
        setLoading(true)
        try{
            await authProvider.sendMail(values)
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
        navigate('/login/verify/reset-password')
    }


    return (
        <LoginShell
            subtitle="パスワード再発行用の認証コードを送信します。登録しているメールアドレスを入力してください"
        >
            <SimpleForm
             toolbar={false}
             onSubmit={submitSendMail}
             defaultValues={{mailAddress: ''}}
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
                source="mailAddress"
                label="メールアドレス"
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
                            '認証コードを送信'
                        }
                    </Button>
                    <Typography
                        variant='body1'
                        component="span"
                        fontWeight='600'
                        sx={{ ...font.loginLinkFont, fontSize: FLUID.inputFont }}
                        onClick={()=>{navigate(-1)}}
                    >
                        ログインに戻る
                    </Typography>
                </Box>
            </SimpleForm>
        </LoginShell>
    );
};

export default P002;
