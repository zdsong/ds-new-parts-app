import React, { useEffect, useState } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import LoginLogoIcon from '../assets/icons/D.png';
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

    const navigate = useNavigate()
    const translate = useTranslate();


    useEffect(() => {
        const tempToken = sessionStorage.getItem('externalWarehouseToken')

        if(tempToken){
            navigate('/S050')
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

    // 直接ログイン（ユーザーID/パスワード検証 + トークン検証）
    const submitDirectLogin = async (values: any) => {

        setLoading(true)
        try{
            await authProvider.directLogin(values)
            navigate('/S050')
        }catch(e){
            if(e instanceof Error){
                notify(e.message, { type: 'error' })
            }
        }
        setLoading(false)

    };

    const navigateN002 = () =>{
        navigate('/login/send-email')
    }

    return (
        <Box sx={{

            padding: '100px',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            flexDirection: 'column',
            boxSizing: 'border-box',
        }}>
            <img 
                src={LoginLogoIcon} 
                alt="customIcon" 
                style={{ margin: '5px', height: '120px', width: '150px' }}
            />
            <Typography 
                variant='h4'
                component="h2" 
                gutterBottom
                fontWeight='600'
                style={{ color: 'black' }}
            >
                新部品管理システム｜外部倉庫管理 
            </Typography>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <SimpleForm
                    toolbar={false}
                    onSubmit={submitDirectLogin}
                    defaultValues={{ username: '', password: '' }}
                    mode="onSubmit"
                    reValidateMode="onChange"
                >
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem',
                        width: '600px',
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
                        marginTop: '50px',
                        flexDirection: 'column',
                        gap: '10px',
                    }}>
                        <Box sx={{ display: 'none' }}>
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
                        </Box>

                        <Button
                            variant="contained"
                            disabled={loading}
                            sx={buttonSx.loginButton}
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
                style={{ fontSize: '15px', marginTop: '20px',color: '#7f7f7f' }}
            >
                © nasta Transport Co., Ltd. All Rights Reserved.
            </Typography>
        </Box>
    );
};

export default N001;