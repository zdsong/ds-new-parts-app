export const AppBarSx = {

    baseAppBarSx : {
        '& .RaAppBar-menuButton': {
            display: 'none',
        },
        '& .RaAppBar-toolbar': {
        
        },
        backgroundColor: 'white',
        display: 'flex',
        position: 'relative',
    },
    
    AppBarContainerSx :{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        height: '40px',
        padding: '0',
    },
    
    AppUserMenuSx :{
        '& .RaUserMenu-button': {
            padding: '8px',
        },
    },
    
    LeftSectionSx : {
        display: 'flex',
        alignItems: 'end',
        gap: 2,
    },
    
    RightSectionSx : {
        display: 'flex',
        alignItems: 'end',
        gap: 2,
    },
}

export const MenuSx = {

    MenuBarContainerSx : {
        borderBottom: '2px solid grey',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'white', 
        gap: 1,
        margin: '5px 20px',
        BorderBottom: '1px soild #ffffff !importent' 
    },
    
    MenuButtonSX : {
        backgroundColor: 'grey',
        color: 'white',
        width: '150px',
        height: '40px',
        fontWeight: '500',
        textTransform: 'none',
        fontSize: '1rem',
        padding: '8px 16px',
        '&:hover': {
            fontSize: '1rem',
            backgroundColor: 'grey',
        },
        '&.RaMenuItemLink-active': {
            backgroundColor: '#F68733',
            border: '0px',
            color: 'white', 
        }
    }
}




