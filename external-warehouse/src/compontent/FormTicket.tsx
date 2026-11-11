import React from 'react';

import { Typography } from '@mui/material';

interface CustomInputProps {
    label: string;
    value: string;
    onClick?: React.MouseEventHandler<HTMLHeadingElement> | undefined;
    structure?: 'left-right' | 'top-bottom'
    type?: 'text' | 'password'
    sx?: any;
}

const ticketLeftRightContainerSx = {
    display: 'flex',
    gap: '2rem',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
}

const ticketTopBottomContainerSx = {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
}

const labelLeftRightSx = {
    width: '100px',
    display: 'flex',
    alignItems: 'center'
}

const labelTopBottomSx = {
    width: '100%',
    marginLeft: '5px',
    display: 'flex',
    alignItems: 'center'
}

const valueSx = {
    whiteSpace: 'pre-line',
    flex: 1,
}

const FormTicket: React.FC<CustomInputProps> = ({
    label = '',
    value = '',
    onClick,
    structure = 'top-bottom',
    type = 'text',
    sx = {},
    ...props
}) => {

    return (
        <div style={structure === 'left-right' ? {...(ticketLeftRightContainerSx as React.CSSProperties), ...sx} : {...(ticketTopBottomContainerSx as React.CSSProperties), ...sx}}>
            <Typography 
                component="h3" 
                gutterBottom
                sx={{
                    ...(structure === 'left-right'? labelLeftRightSx : labelTopBottomSx),
                    ...sx?.label
                }}
            >
                {label}
            </Typography>
            <Typography 
                component="h3" 
                gutterBottom
                sx={{
                    ...valueSx,
                    ...sx?.input
                }}
                onClick={onClick}
            >
                {
                    type === 'password' ? '* * * * * *' : value
                }
            </Typography>
        </div>
    );
};

export default FormTicket;