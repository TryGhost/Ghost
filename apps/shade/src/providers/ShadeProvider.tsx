import NiceModal from '@ebay/nice-modal-react';
import React, {createContext, useContext, useState} from 'react';
import {Toaster} from 'react-hot-toast';
// import {FetchKoenigLexical} from '../global/form/HtmlEditor';
import {GlobalDirtyStateProvider} from '../hooks/useGlobalDirtyState';

interface ShadeContextType {
    isAnyTextFieldFocused: boolean;
    setFocusState: (value: boolean) => void;
    // fetchKoenigLexical: FetchKoenigLexical;
    darkMode: boolean;
}

const ShadeContext = createContext<ShadeContextType>({
    isAnyTextFieldFocused: false,
    setFocusState: () => {},
    // fetchKoenigLexical: async () => {},
    darkMode: false
});

export const useShade = () => useContext(ShadeContext);

export const useFocusContext = () => {
    const context = useShade();
    if (!context) {
        throw new Error('useFocusContext must be used within a FocusProvider');
    }
    return context;
};

interface ShadeProviderProps {
    // fetchKoenigLexical: FetchKoenigLexical;
    darkMode: boolean;
    children: React.ReactNode;
}

const ShadeProvider: React.FC<ShadeProviderProps> = ({darkMode, children}) => {
    const [isAnyTextFieldFocused, setIsAnyTextFieldFocused] = useState(false);

    const setFocusState = (value: boolean) => {
        setIsAnyTextFieldFocused(value);
    };

    return (
        <ShadeContext.Provider value={{isAnyTextFieldFocused, setFocusState, darkMode}}>
            <GlobalDirtyStateProvider>
                <Toaster />
                <NiceModal.Provider>
                    {children}
                </NiceModal.Provider>
            </GlobalDirtyStateProvider>
        </ShadeContext.Provider>
    );
};

export default ShadeProvider;
