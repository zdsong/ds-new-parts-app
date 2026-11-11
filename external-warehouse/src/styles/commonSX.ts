export const buttonSx = {
    buttonBar : {
        margin: '5px 0',
        width: '100%',
        display: 'flex',
        gap: '1rem',
        alignItems: 'end',
        justifyContent: 'end',
    },

    centerButtonBar : {
        width: '100%',
        display: 'flex',
        gap: '1rem',
        alignItems: 'end',
        justifyContent: 'center',
        margin: '10px 0 5px 0',
    },
    loginButton:{
        height: '50px',
        width: '400px',
        bgcolor: 'color-mix(in srgb, var(--mui-yamato-page-header-color) 90%, white 10%)',
        fontSize: '20px',
        borderRadius: 0,
        color: 'white',
        '&:hover': { bgcolor: 'color-mix(in srgb, var(--mui-yamato-page-header-color) 80%, black 20%)' },
        '&:disabled': { bgcolor: '#cccccc', cursor: 'not-allowed' },
    },
                        
    button : {
        backgroundColor: 'var(--mui-yamato-page-header-color)',
        padding: '0.5rem 1rem',
        color: 'white',
        border: 'none',
        width: '150px',
        borderRadius: '5px',
        cursor: 'pointer',
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
    form1 : {
        width: '100%', 
        display: 'grid', 
        gridTemplateColumns: '5fr 5fr',
        columnGap: '5rem',
    },

    form2 : {
        width: '100%', 
        display: 'grid', 
        gridTemplateColumns: '5fr 5fr',
        rowGap: '1rem',
        columnGap: '5rem',
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
