export const modalStyles = {
  paperRoot: {
    '&.MuiPaper-root': {
      borderRadius: 0,
      border: 0,
    }
  },

  
  modalTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '2px 20px',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    
    '& .MuiTypography-root': {
      fontWeight: 600,
    },
    
    '& h2': {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.6,
      margin: 0,
    }
  },

  modalCloseButton: {
    color: 'var(--text-secondary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s ease-in-out',
    
    '&:hover': {
      backgroundColor: 'var(--action-hover)',
      color: 'var(--text-primary)',
    }
  },

  modalContainer: {
    padding: 0,
    minHeight: '300px',
  },

  modalContent: {
    padding: '0',
    
    '&.with-dividers': {
      borderBottom: '1px solid var(--divider-color)',
    }
  },

  modalContentInner: {
    minHeight: '100px',
    overflow: 'auto',
    overflowX: 'hidden',
    '&.mobile': {
      maxHeight: 'calc(100vh - 200px)',
    },
    
    '&.desktop': {
      maxHeight: 'calc(90vh - 200px)',
    }
  },

  modalActions: {
    padding: '16px 24px',
    gap: '8px',
    flexWrap: 'wrap',
    position: 'sticky',
    bottom: 0,
    backgroundColor: 'var(--background-paper)',
    borderTop: '1px solid var(--divider-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  modalActionButton: {
    borderRadius: '8px',
    textTransform: 'none',
    fontWeight: 500,
    minWidth: '80px',
    padding: '8px 16px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    }
  }
};