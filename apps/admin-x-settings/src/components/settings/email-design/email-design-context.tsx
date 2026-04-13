import {type ReactNode, createContext, useContext} from 'react';
import type {EmailDesignSettings} from './types';

interface EmailDesignContextValue {
    settings: EmailDesignSettings;
    onSettingsChange: (updates: Partial<EmailDesignSettings>) => void;
    accentColor: string;
}

const EmailDesignContext = createContext<EmailDesignContextValue | undefined>(undefined);

interface EmailDesignProviderProps extends EmailDesignContextValue {
    children: ReactNode;
}

export const EmailDesignProvider = ({settings, onSettingsChange, accentColor, children}: EmailDesignProviderProps) => (
    <EmailDesignContext.Provider value={{settings, onSettingsChange, accentColor}}>
        {children}
    </EmailDesignContext.Provider>
);

export const useEmailDesign = (): EmailDesignContextValue => {
    const ctx = useContext(EmailDesignContext);
    if (!ctx) {
        throw new Error('useEmailDesign must be used within an EmailDesignProvider');
    }
    return ctx;
};
