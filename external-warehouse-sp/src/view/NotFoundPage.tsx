import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslate } from 'react-admin';

const NotFoundPage = () => {
  const translate = useTranslate();
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '80vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" sx={{ fontSize: '4rem', fontWeight: 'bold', mb: 4 }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {translate('ra.page.not_found')}
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          アクセスできないページです。URL を確認するか、管理者に問い合わせてください。
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/')}
        >
          ホームに戻る
        </Button>
      </Box>
    </Container>
  );
};

export default NotFoundPage;