import React, { useEffect, useState } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import LoginLogoIcon from '../assets/icons/login-logo-icon.png';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Button, SimpleForm, required, useNotify, useTranslate } from 'react-admin';
import  LabelInput  from '../compontent/LabelInput';
import { useNavigate } from 'react-router-dom';

import {authProvider} from '../adapters/authProvider'
import { buttonSx, font } from '../styles/commonSX';

interface LoginPageDatas {
    
}

const N001: React.FC<LoginPageDatas> = () => {
    const [loading, setLoading] = useState(false);
    const notify = useNotify();
    const translate = useTranslate();
    const navigate = useNavigate()

    useEffect(() => {
        const tempToken = sessionStorage.getItem('externalWarehouseToken')

        if(tempToken){
            navigate('/N006')
        }
    }, []);

    const submitLogin = async (values: any) => {

        setLoading(true)
        try{
            await authProvider.logSend(values)
            notify(translate('ra.message.send_success'), { type: 'success' })
            navigateN003()
        }catch(e){
            if(e instanceof Error){
                notify(e.message, { type: 'error' })
            }
        }
        setLoading(false)
        
    };

    const navigateN003 = () =>{
        navigate('/login/verify/login')
    }

    const navigateN002 = () =>{
        navigate('/login/send-email')
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
                style={{ color: 'black' }}
            >
                新 産 直 く ん 
            </Typography>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center',marginTop: '5vh', width: '100%', padding: 0, }}>
                <SimpleForm
                    toolbar={false}
                    onSubmit={submitLogin}
                    defaultValues={{ username: '', password: '' }}
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
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        width: '100%',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <LabelInput
                            source="username"
                            label="ユーザID"
                            type="text"
                            validate={[required()]} 
                        />

                        <LabelInput
                            source="password"
                            label="パスワード"
                            type="password"
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
                                <CircularProgress size={19} thickness={3} sx={{ color: 'white' }} />
                            ) : '認証コードを送信'}
                        </Button>

                        <Typography
                            variant='body1'
                            component="span"
                            fontWeight='600'
                            sx={font.loginLinkFont}
                            onClick={()=>{navigateN002()}}
                        >
                            パスワードを忘れた方はこちら 
                        </Typography>
                    </Box>
                </SimpleForm>
            </div>
            <Typography
                gutterBottom
                fontWeight='600'
                style={{ fontSize: '12px',color: '#7f7f7f', whiteSpace: 'nowrap', marginBottom: '70px' }}
            >
                © Yamato Transport Co., Ltd. All Rights Reserved.
            </Typography>
        </Box>
    );
};

export default N001;