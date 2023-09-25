// FocusContext.tsx
import React, {createContext, useContext, useState} from 'react';

interface DesignSystemContextType {
    isAnyTextFieldFocused: boolean;
    setFocusState: (value: boolean) => void;
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
    children: React.ReactNode;
}

const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({children}) => {
    const [isAnyTextFieldFocused, setIsAnyTextFieldFocused] = useState(false);

    const setFocusState = (value: boolean) => {
        setIsAnyTextFieldFocused(value);
    };

    return (
        <DesignSystemContext.Provider value={{isAnyTextFieldFocused, setFocusState}}>
            {children}
        </DesignSystemContext.Provider>
    );
};

export default DesignSystemProvider;