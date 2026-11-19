import React from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { Box, Typography, CircularProgress, styled } from '@mui/material';
import { Button, LoginFormClasses, SimpleForm, required, useNotify, useTranslate } from 'react-admin';
import LabelInput from '../compontent/LabelInput';
import LoginShell, { FLUID, fluidInputSx, fluidLoginButtonSx } from '../compontent/LoginShell';
import { authProvider } from '../adapters/authProvider';
import { useNavigate } from 'react-router';
import useApiRequest from '../adapters/apiUtil';
import { HOME_ROUTE } from '../utils/appRoutes';

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

const P004 = () => {


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
            navigateHome()
        }
        setLoading(false)

    };

    const navigateHome = () =>{
        navigate(HOME_ROUTE)
    }

    return (
        <LoginShell subtitle="新しいパスワードを登録してください">
            <SimpleForm
            toolbar={false}
            onSubmit={submitResetPassword}
            defaultValues={{newPassword: '', confimPassword: '' }}
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
                source="newPassword"
                label="新しいパスワード"
                type="password"
                sx={fluidInputSx}
                validate={[required()]}
                />

                <LabelInput
                source="confimPassword"
                label="新しいパスワード（確認用）"
                type="password"
                sx={fluidInputSx}
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
                            '登録'
                        }
                    </Button>
                </Box>
            </SimpleForm>
        </LoginShell>
    );
};

export default P004;
