/** 戻るボタンの淡い青。主ボタンより一段薄く、SP401 に合わせる */
export const BACK_BUTTON_COLOR = '#6f9fd0';

const baseButton = {
    padding: '0.5rem 1rem',
    color: 'white',
    border: 'none',
    width: '150px',
    borderRadius: '5px',
    cursor: 'pointer',
};

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
        bgcolor: 'color-mix(in srgb, var(--mui-page-header-color) 90%, white 10%)',
        fontSize: '20px',
        borderRadius: 0,
        color: 'white',
        '&:hover': { bgcolor: 'color-mix(in srgb, var(--mui-page-header-color) 80%, black 20%)' },
        '&:disabled': { bgcolor: '#cccccc', cursor: 'not-allowed' },
    },
                        
    button : {
        ...baseButton,
        backgroundColor: 'var(--mui-page-header-color)',
    },

    /** 戻る。大きさは通常ボタンと同じで、色だけ一段薄くする */
    backButton: {
        ...baseButton,
        backgroundColor: BACK_BUTTON_COLOR,
    },

    disabledButton: {
        ...baseButton,
        backgroundColor: '#CCCCCC',
        color: '#666666',
    }
}

export const tableSx = {

    tableContainer : {
        width: '100%', 
    },

    linkFontColumn : {
        cursor: 'pointer', 
        color: 'var(--mui-page-header-color)' 
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
        color: 'var(--mui-card-header-color)'
    },
    loginLinkFont : {
        color: 'color-mix(in srgb, var(--mui-page-header-color) 90%, white 10%)',
        cursor: 'pointer',
        '&:hover': {
            textDecoration: 'underline',
            textDecorationColor: 'color-mix(in srgb, var(--mui-page-header-color) 80%, black 20%)',
            textUnderlineOffset: '2px',
            color: 'color-mix(in srgb, var(--mui-page-header-color) 80%, black 20%)',
        }
    }
}
