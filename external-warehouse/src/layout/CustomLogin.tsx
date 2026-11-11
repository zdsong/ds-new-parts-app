import {
    Typography,
    Box,
} from '@mui/material';

import { LoginSx } from '../styles/loginSx';
import N001 from '../view/N001';
import ThemeToggle from './ThemeToggel';

const CustomLoginPage = () => {

    return(
    <Box sx={LoginSx.loginPageSx}> 
    <div style={{display: 'none'}}><ThemeToggle></ThemeToggle></div>
        <N001></N001>
    </Box>
        
)}

export default CustomLoginPage;