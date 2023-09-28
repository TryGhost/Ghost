// FocusContext.tsx
import React, {createContext, useContext, useState} from 'react';

interface DesignSystemContextType {
    isAnyTextFieldFocused: boolean;
    setFocusState: (value: boolean) => void;
    fetchKoenigLexical: any;
}

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

export const useFocusContext = () => {
    const context = useContext(DesignSystemContext);
    if (!context) {
        throw new Error('useFocusContext must be used within a FocusProvider');
    }
    return context;
};

interface DesignSystemProviderProps {
    fetchKoenigLexical: any;
    children: React.ReactNode;
}

const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({fetchKoenigLexical, children}) => {
    const [isAnyTextFieldFocused, setIsAnyTextFieldFocused] = useState(false);

    const setFocusState = (value: boolean) => {
        setIsAnyTextFieldFocused(value);
    };

    return (
        <DesignSystemContext.Provider value={{isAnyTextFieldFocused, fetchKoenigLexical, setFocusState}}>
            {children}
        </DesignSystemContext.Provider>
    );
};

export default DesignSystemProvider;
