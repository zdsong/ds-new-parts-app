import { useState, createContext, useContext, ReactNode } from 'react';

type PopupType = 'menu' | 'message' | null;

interface PopupMutexContextType {
  activePopup: PopupType;
  setActivePopup: (popup: PopupType) => void;
  closeAllPopups: () => void;
  PopupParam: any;
  setPopupParam: (param: any) => void;
}

const PopupMutexContext = createContext<PopupMutexContextType | undefined>(undefined);

export const PopupMutexProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePopup, setActivePopup] = useState<PopupType>(null);
  const [PopupParam, setPopupParam] = useState<any>(null);

  const closeAllPopups = () => setActivePopup(null);

  return (
    <PopupMutexContext.Provider 
      value={{ 
        activePopup, 
        setActivePopup, 
        closeAllPopups,
        PopupParam,
        setPopupParam
      }}
    >
      {children}
    </PopupMutexContext.Provider>
  );
};

export const usePopupControl = () => {
  const context = useContext(PopupMutexContext);
  if (!context) {
    throw new Error('usePopupMutex は PopupMutexProvider 内で使用してください');
  }
  return context;
};