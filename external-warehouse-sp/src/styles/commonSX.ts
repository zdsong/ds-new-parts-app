export const buttonSx = {
    buttonBar : {
        margin: '5px 10px',
        width: '100%',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'center'
    },
    
    button : {
        backgroundColor: 'var(--mui-yamato-page-header-color)',
        padding: '0.5rem 1rem',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },

    loginButton:{
        height: '10vw',
        maxHeight: '50px',
        width: '100%',
        maxWidth: '300px',
        bgcolor: 'color-mix(in srgb, var(--mui-yamato-page-header-color) 90%, white 10%)',
        fontSize: '20px',
        borderRadius: 0,
        color: 'white',
        '&:hover': { bgcolor: 'color-mix(in srgb, var(--mui-yamato-page-header-color) 80%, black 20%)' },
        '&:disabled': { bgcolor: '#cccccc', cursor: 'not-allowed' },
    },

    disabledButton: {
        backgroundColor: '#CCCCCC',
        padding: '0.5rem 1rem',
        color: '#666666',
        border: 'none',
        width: '150px',
        borderRadius: '5px',
        cursor: 'pointer',
    }
}

export const tableSx = {

    tableContainer : {
        height: '100%', 
        width: '100%', 
    },

    linkFontColumn : {
        cursor: 'pointer', 
        color: 'var(--mui-yamato-page-header-color)' 
    }
}

export const formSx = {
    formContainer : {
        margin: 0, 
        width: '100%', 
        padding: '0px !important', 
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flex: 1,
    },
}

export const inputSx = {

}

export const ticketSx = {
    ticket1: {
        label: {
            color: '#7f7f7f'
        }
    },
    ticket2: {
        label: {
            backgroundColor: '#7f7f7f',
            justifyContent: 'center',
            borderRadius: '5px',
            color: 'white',
        }
    },
    ticket3: {
        label: {
            backgroundColor: '#7f7f7f',
            justifyContent: 'center',
            borderRadius: '5px',
            color: 'white',
            width: '130px'
        }
    }
}

export const cardSx = {
    margin: '10px',  
    border: '1px solid #d9d9d9',
    borderRadius: '5px',
}

export const pageSx = {
    pageContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '0 20px ',
        overflow: 'auto'
    },
    titleContainer: {
        marginTop: '10px',
        display: 'flex',
        alignItems: 'end',
        borderBottom: '2px solid #7F7F7F',
        padding: '5px 0'
    },
    title: {
        color: 'black', 
        fontSize: '18px', 
        fontWeight: '600', 
        flex: 1
    }
}

export const font = {
    linkFont : {
        color: 'var(--mui-yamato-card-header-color)'
    },
    loginLinkFont : {
        color: 'color-mix(in srgb, var(--mui-yamato-page-header-color) 90%, white 10%)',
        cursor: 'pointer',
        '&:hover': {
            textDecoration: 'underline',
            textDecorationColor: 'color-mix(in srgb, var(--mui-yamato-page-header-color) 80%, black 20%)',
            textUnderlineOffset: '2px',
            color: 'color-mix(in srgb, var(--mui-yamato-page-header-color) 80%, black 20%)',
        }
    }
}
