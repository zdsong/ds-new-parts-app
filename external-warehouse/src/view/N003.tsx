import React, { useEffect } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import LoginLogoIcon from '../assets/icons/login-logo-icon.png'

import { Box, Typography, CircularProgress } from '@mui/material';
import { Button, LoginFormClasses, SimpleForm, required, useNotify, useTranslate } from 'react-admin';
import LabelInput from '../compontent/LabelInput';
import { useNavigate, useParams } from 'react-router';
import { authProvider } from '../adapters/authProvider';
import { buttonSx, font } from '../styles/commonSX';


const N003 = () => {

    
    const [loading, setLoading] = React.useState(false);
    const notify = useNotify();
    const translate = useTranslate();
    const navigate = useNavigate()

    const { type } = useParams<{ type: string }>()

    useEffect(() => {
        const tempToken = sessionStorage.getItem('externalWarehouseToken')

        if(tempToken){
            navigate('/N006')
        }
    }, []);

    const submitVerify = async (values: any) => {
        setLoading(true)
        try{
           const response = await authProvider.login(values)
            if(type === 'login'){
                await authProvider.checkAuth(response.data)
                navigateN006()
            }else if(type === 'reset-password'){
                navigateN004()
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

    const navigateN006 = () =>{
        navigate('/N006')
    }

    const navigateN004 = () =>{
        navigate('/N004')
    }



    return (
        <Box sx={{
            padding: '100px',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            flexDirection: 'column',
        }}>
            <img src={LoginLogoIcon} alt="customIcon" style={{
            margin: '5px',
            height: '120px',
            width: '150px'
            }}/>
            <Typography 
                variant='h4'
                component="h2" 
                gutterBottom
                fontWeight='600'
                style={{ 
                color: 'black'
                }}
            >
                新 産 直 く ん 
            </Typography>
            <Typography 
                gutterBottom
                fontWeight='600'
                style={{ 
                fontSize: '15px',
                margin: '30px 0'
                }}
            >
                メールでお送りした認証コードを入力してください 
            </Typography>
            <div
            style={{
                flex: 1,
            }}
            >
            <SimpleForm
            toolbar={false}
            onSubmit={submitVerify}
            defaultValues={{verifyCode: '' }}
            mode="onSubmit"
            reValidateMode="onChange"
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem',
                        width: '600px',
                    }}
                >

                <LabelInput
                source="verifyCode"
                label="認証コード"
                type="text"
                validate={[required()]} 
                />

                </div>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '600px',
                    marginTop: '50px',
                    flexDirection: 'column',
                    gap: '10px',
                    height: '100%',
                    flex: 1
                }}>
                    <Button 
                        variant="contained"
                        disabled={loading}
                        sx={buttonSx.loginButton}
                        type="submit"
                    >
                        {loading ? (
                            <CircularProgress
                                className={LoginFormClasses.icon}
                                size={19}
                                thickness={3}
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
                        sx={font.loginLinkFont}
                        onClick={submitResendCode}
                    >
                        認証コードを再送信する 
                    </Typography>
                </Box>
            </SimpleForm>
            </div>
            <Typography 
                gutterBottom
                fontWeight='600'
                style={{ fontSize: '15px', marginTop: '20px',color: '#7f7f7f' }}
            >
                © Yamato Transport Co., Ltd. All Rights Reserved.
            </Typography>
        </Box>
    );
};

export default N003;