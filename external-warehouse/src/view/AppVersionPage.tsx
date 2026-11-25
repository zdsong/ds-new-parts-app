
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { BACK_BUTTON_COLOR } from '../styles/commonSX';

const AppVersionPage = () => {
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
        <Typography variant="h1" sx={{ fontSize: '3rem', fontWeight: 'bold', mb: 4 }}>
          システム バージョン: {import.meta.env.VITE_APP_VERSION}
        </Typography>
       
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ backgroundColor: BACK_BUTTON_COLOR, '&:hover': { backgroundColor: '#5b8dc1' } }}
        >
          ホームに戻る
        </Button>
      </Box>
    </Container>
  );
};

export default AppVersionPage;