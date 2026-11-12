import React, { useEffect } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import LoginLogoIcon from '../assets/icons/D.png'

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
            padding: '2vw',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            flexDirection: 'column',
            boxSizing: 'border-box',
            overflow: 'auto',
        }}>
            <img 
                src={LoginLogoIcon} 
                alt="customIcon" 
                style={{ margin: '2vh 0 4vh 0', width: '20vw', maxWidth: '150px' }}
            />
            <Typography 
                variant='h5'
                component="h2" 
                gutterBottom
                fontWeight='600'
                style={{ 
                color: 'black'
                }}
            >
                新部品管理システム｜外部倉庫管理 
            </Typography>
            <Typography 
                gutterBottom
                fontWeight='600'
                style={{ 
                fontSize: '12px',
                margin: '2vh 10vw'
                }}
            >
                メールでお送りした認証コードを入力してください 
            </Typography>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', marginTop: '5vh', width: '100%', padding: 0, }}>
            <SimpleForm
            toolbar={false}
            onSubmit={submitVerify}
            defaultValues={{verifyCode: '' }}
            mode="onSubmit"
            reValidateMode="onChange"
            sx={{
                width: '90vw',
                padding: '0 5vw',
                display: 'flex',
                justifyContent: 'center',
                paddingBottom: '0 !important'
            }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        width: '100%',
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
                    width: '100%',
                    marginTop: '5vh',
                    flexDirection: 'column',
                    gap: '2vh',
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
                style={{ fontSize: '12px',color: '#7f7f7f', whiteSpace: 'nowrap', marginBottom: '70px' }}
            >
                © nasta Transport Co., Ltd. All Rights Reserved.
            </Typography>
        </Box>
    );
};

export default N003;