import React from 'react';

export const baseInputStyle = {
    baseInputStyle : {
      width: '100%',
      height: '22px',
      padding: '2px 4px',
      border: '1px solid #000',
      borderRadius: 0,
      backgroundColor: 'white',
      fontSize: '14px',
      outline: 'none',
      '&:hover': {
          border: '2px solid #000'
      },
      '&:focus': {
          border: '2px solid #000',
          boxShadow: 'none'
      },
      '&:disabled': {
          backgroundColor: '#f5f5f5',
          borderColor: '#ccc',
          cursor: 'not-allowed'
      }
  },

  checkboxStyle : {
      width: '22px',
      height: '22px',
      border: '2px solid #000',
      borderRadius: 0,
      backgroundColor: 'white',
      cursor: 'pointer',
      '&:checked': {
          backgroundColor: '#000',
          borderColor: '#000'
      }
  },

  containerStyle : {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '20px',
  },

  labelStyle : {
      minWidth: '120px',
      fontWeight: 'bold',
      fontSize: '14px',
      color: '#333'
  },

  

  baseSelectInputStyle: {
      width: '100%', 
      height: '22px',
      padding: '2px 50px 2px 4px',
      border: '1px solid #000',
      borderRadius: 0,
      backgroundColor: 'white',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      position: 'relative',
  },

  dropdownStyle: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: 'white',
      border: '1px solid #000',
      borderTop: 'none',
      maxHeight: '200px',
      overflowY: 'auto',
      zIndex: 1000,
      marginTop: '2px'
  },

  optionStyle: {
      padding: '12px 16px',
      backgroundColor: 'white',
      color: '#333',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
  },

  selectedOptionStyle : {
      backgroundColor: '#667eea',
      color: 'white' 
  },

  arrowOpenStyle: {
      position: 'absolute',
      right: '16px', 
      top: '50%',
      transform: 'translateY(-50%) rotate(180deg)',
      width: '12px',
      height: '12px',
      borderRight: '2px solid #000',
      borderBottom: '2px solid #000',
      pointerEvents: 'none',
      zIndex: 3,
      transition: 'transform 0.3s ease'
  },

  arrowCloseStyle: {
      position: 'absolute',
      right: '16px', 
      top: '50%',
      transform: 'translateY(-50%) rotate(0deg)',
      width: '12px',
      height: '12px',
      borderRight: '2px solid #000',
      borderBottom: '2px solid #000',
      pointerEvents: 'none',
      zIndex: 3,
      transition: 'transform 0.3s ease'
  },

  imageInputContainerSx : {
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      p: 0,
      minWidth: 'auto',
      borderRadius: 0,
  }

}

export const imageUploaderStyles = {
    root: {
      position: 'relative',
      display: 'inline-block',
    },
    
    button: {
      justifyContent: 'center',
      height: 120,
      width: 120,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      p: 0,
      minWidth: 'auto',
      borderRadius: 0,
    },
    
    avatar: {
      width: '100%',
      height: '100%',
      cursor: 'pointer',
      borderRadius: 0,
      '&:hover': {
        opacity: 0.9,
      }
    },
    
    placeholderContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1,
      color: 'text.secondary'
    },
    
    deleteButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      color: 'white',
      '&:hover': {
        backgroundColor: 'rgba(0,0,0,0.8)',
      },
      width: 24,
      height: 24
    },
    
    modal: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    modalContent: {
      position: 'relative',
      outline: 'none',
      maxWidth: '90vw',
      maxHeight: '90vh',
    },
    
    modalCloseButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(0,0,0,0.6)',
      color: 'white',
      zIndex: 1,
      '&:hover': {
        backgroundColor: 'rgba(0,0,0,0.8)',
      }
    },
    
    previewImage: {
      maxWidth: '90vw',
      maxHeight: '90vh',
      objectFit: 'contain' as const,
    }
  };

