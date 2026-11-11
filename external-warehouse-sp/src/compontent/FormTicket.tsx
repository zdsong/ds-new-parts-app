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

const fontSize = '15px'

const ticketLeftRightContainerSx = {
    display: 'flex',
    gap: '2rem',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'start',
}

const ticketTopBottomContainerSx = {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
}

const labelLeftRightSx = {
    width: '100px',
    minWidth: '100px',
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
        <div style={structure === 'left-right' ? ticketLeftRightContainerSx as React.CSSProperties : ticketTopBottomContainerSx as React.CSSProperties}>
            <Typography
                gutterBottom
                sx={{
                    fontSize: fontSize,
                    ...(structure === 'left-right'? labelLeftRightSx : labelTopBottomSx),
                    ...sx?.label
                }}
            >
                {label}
            </Typography>
           <Typography
                gutterBottom
                sx={{
                    fontSize: fontSize,
                    // paddingTop: '5px',
                    ...valueSx,
                    ...sx?.input,
                    textAlign: sx?.input?.textAlign || 'left'
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