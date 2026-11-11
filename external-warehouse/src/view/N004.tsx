import React from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import LoginLogoIcon from '../assets/icons/login-logo-icon.png'

import { Box, Typography, CircularProgress, styled } from '@mui/material';
import { Button, LoginFormClasses, SimpleForm, required, useNotify, useTranslate } from 'react-admin';
import LabelInput from '../compontent/LabelInput';
import { authProvider } from '../adapters/authProvider';
import { useNavigate } from 'react-router';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx } from '../styles/commonSX';

const PasswordRuleTip = styled(Box)(({ }) => ({
    position: 'relative',
    paddingLeft: '20px',
    marginTop: '8px',
    width: '100%',
    '&::before': {
      content: '"!"',
      position: 'absolute',
      left: '0',
      top: '0',
      width: '16px',
      height: '16px',
      backgroundColor: '#f44336',
      color: '#fff',
      fontSize: '12px',
      lineHeight: '16px',
      textAlign: 'center',
      fontWeight: 'bold',
      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    },
  }));

const N004 = () => {

    
    const [loading, setLoading] = React.useState(false);
    const notify = useNotify();
    const navigate = useNavigate()
    const translate = useTranslate();
    const { request } = useApiRequest();

    const submitResetPassword = async (values: any) => {
        setLoading(true)
        const response = await request('post', 'api/auth/resetPwd', values, {}, false, false)
        if(response.code === 200 ){
            notify(translate('ra.message.password_change_success'), { type: 'success' })
            try{
                await authProvider.checkAuth(response.data)
            }catch(e){
                if(e instanceof Error){
                   notify(e.message, { type: 'error' })
               }
           }
            navigateN006()
        }
        setLoading(false)
        
    };

    const navigateN006 = () =>{
        navigate('/N006')
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
                新しいパスワードを登録してください
            </Typography>
            <div
            style={{
                flex: 1,
            }}
            >
            <SimpleForm
            toolbar={false}
            onSubmit={submitResetPassword}
            defaultValues={{newPassword: '', confimPassword: '' }}
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
                source="newPassword"
                label="新しいパスワード"
                type="password"
                sx={{
                    width: '600px'
                }}
                validate={[required()]} 
                />

                <LabelInput
                source="confimPassword"
                label="新しいパスワード（確認用）"
                type="password"
                sx={{
                    width: '600px'
                }}
                validate={[required()]} 
                />

                </div>

                <div style={{maxWidth: ''}}>
                <PasswordRuleTip sx={{ marginLeft: 0}}>
                    <Typography sx={{ color: '#f44336', fontSize: '12px', lineHeight: 1.6, fontWeight: '500' }}>
                    ８文字以上で入力してください。
                    </Typography>
                </PasswordRuleTip>
                <PasswordRuleTip sx={{ marginLeft: 0}}>
                    <Typography sx={{ color: '#f44336', fontSize: '12px', lineHeight: 1.6, fontWeight: '500' }}>
                    大文字を含める必要があります (A-Z)。<br />
                    </Typography>
                </PasswordRuleTip>
                <PasswordRuleTip sx={{ marginLeft: 0}}>
                    <Typography sx={{ color: '#f44336', fontSize: '12px', lineHeight: 1.6, fontWeight: '500' }}>
                    数字を含める必要があります (0-9)。<br />
                    </Typography>
                </PasswordRuleTip>
                <PasswordRuleTip sx={{ marginLeft: 0}}>
                    <Typography sx={{ color: '#f44336', fontSize: '12px', lineHeight: 1.6, fontWeight: '500' }}>
                    {`特殊文字を含める必要があります (#?!@$%^&*-)。`}
                    </Typography>
                </PasswordRuleTip>
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
                            '登録'
                        }
                    </Button>
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

export default N004;