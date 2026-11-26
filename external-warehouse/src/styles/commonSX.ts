/**
 * 単一選択・複数選択の印（ラジオ／チェック）。
 * 大きさ・余白・選択色を画面の共通色に揃える。
 */
export const choiceMarkSx = {
    padding: '4px',
    '& .MuiSvgIcon-root': { fontSize: '20px' },
    '&.Mui-checked:not(.Mui-disabled)': {
        color: 'var(--mui-page-header-color)',
    },
};

/** 単一選択・複数選択のラベルと余白（横並びの見た目を揃える） */
export const choiceControlSx = {
    '& .MuiFormControlLabel-root': {
        margin: 0,
        width: 'auto',
        flex: 'none',
    },
    '& .MuiRadio-root, & .MuiCheckbox-root': choiceMarkSx,
    '& .MuiFormControlLabel-label': { fontSize: '14px', lineHeight: 1.2 },
};

/** RadioGroup へ直接付けるときの横並び */
export const choiceGroupRowSx = {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '2px 12px',
    ...choiceControlSx,
};

/** 戻るボタン。主ボタンより一段薄く、選択中のスタイル色に合わせる */
export const BACK_BUTTON_COLOR = 'var(--mui-back-button-color, #6f9fd0)';

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

    /** 入力欄と画面下の操作ボタンを分ける */
    formActionBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '8px',
        paddingTop: '16px',
        borderTop: '1px solid #d0d0d0',
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
