// FocusContext.tsx
import NiceModal from '@ebay/nice-modal-react';
import React, {createContext, useContext, useState} from 'react';
import {Toaster} from 'react-hot-toast';
import {FetchKoenigLexical} from '../global/form/HtmlEditor';
import {GlobalDirtyStateProvider} from '../hooks/useGlobalDirtyState';

interface DesignSystemContextType {
    isAnyTextFieldFocused: boolean;
    setFocusState: (value: boolean) => void;
    fetchKoenigLexical: FetchKoenigLexical;
    darkMode: boolean;
}

const DesignSystemContext = createContext<DesignSystemContextType>({
    isAnyTextFieldFocused: false,
    setFocusState: () => {},
    fetchKoenigLexical: async () => {},
    darkMode: false
});

export const useDesignSystem = () => useContext(DesignSystemContext);

export const useFocusContext = () => {
    const context = useDesignSystem();
    if (!context) {
        throw new Error('useFocusContext must be used within a FocusProvider');
    }
    return context;
};

interface DesignSystemProviderProps {
    fetchKoenigLexical: FetchKoenigLexical;
    darkMode: boolean;
    children: React.ReactNode;
}

const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({fetchKoenigLexical, darkMode, children}) => {
    const [isAnyTextFieldFocused, setIsAnyTextFieldFocused] = useState(false);

    const setFocusState = (value: boolean) => {
        setIsAnyTextFieldFocused(value);
    };

    return (
        <DesignSystemContext.Provider value={{isAnyTextFieldFocused, setFocusState, fetchKoenigLexical, darkMode}}>
            <GlobalDirtyStateProvider>
                <Toaster />
                <NiceModal.Provider>
                    {children}
                </NiceModal.Provider>
            </GlobalDirtyStateProvider>
        </DesignSystemContext.Provider>
    );
};

export default DesignSystemProvider;
