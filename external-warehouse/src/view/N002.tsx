import React, { useEffect } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import LoginLogoIcon from '../assets/icons/login-logo-icon.png'

import { Box, Typography, CircularProgress } from '@mui/material';
import { Button, LoginFormClasses, SimpleForm, required, useNotify, useTranslate } from 'react-admin';
import  LabelInput from '../compontent/LabelInput';

import { useNavigate } from 'react-router-dom';
import { authProvider } from '../adapters/authProvider';
import { buttonSx, font } from '../styles/commonSX';


const N002 = () => {

    
    const [loading, setLoading] = React.useState(false);
    const notify = useNotify();
    const translate = useTranslate();
    const navigate = useNavigate() 

    useEffect(() => {
        const tempToken = sessionStorage.getItem('externalWarehouseToken')

        if(tempToken){
            navigate('/N006')
        }
    }, []);

    const submitSendMail = async (values: any) => {
        setLoading(true)
        try{
            await authProvider.sendMail(values)
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
        navigate('/login/verify/reset-password')
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
                新部品管理システム｜外部倉庫管理 
            </Typography>
            <Typography 
                gutterBottom
                fontWeight='600'
                style={{ 
                fontSize: '15px',
                margin: '30px 0'
                }}
            >
                パスワード再発行用の認証コードを送信します。登録しているメールアドレスを入力してください
            </Typography>

            <div
            style={{
                flex: 1,
            }}
            >
            <SimpleForm
             toolbar={false}
             onSubmit={submitSendMail}
             defaultValues={{mailAddress: ''}}
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
                source="mailAddress"
                label="メールアドレス"
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
                            '認証コードを送信'
                        }
                    </Button>
                    <Typography
                        variant='body1'
                        component="span"
                        fontWeight='600'
                        sx={font.loginLinkFont}
                        onClick={()=>{navigate(-1)}}
                    >
                        ログインに戻る 
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

export default N002;