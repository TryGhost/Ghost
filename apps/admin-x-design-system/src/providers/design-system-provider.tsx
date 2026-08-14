// FocusContext.tsx
import NiceModal from '@ebay/nice-modal-react';
import React, {createContext, useContext} from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FetchKoenigLexical = () => Promise<any>;

interface DesignSystemContextType {
    fetchKoenigLexical: FetchKoenigLexical;
    darkMode: boolean;
}

const DesignSystemContext = createContext<DesignSystemContextType>({
    fetchKoenigLexical: async () => {},
    darkMode: false
});

export const useDesignSystem = () => useContext(DesignSystemContext);

interface DesignSystemProviderProps {
    fetchKoenigLexical: FetchKoenigLexical;
    darkMode: boolean;
    children: React.ReactNode;
}

const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({fetchKoenigLexical, darkMode, children}) => {
    return (
        <DesignSystemContext.Provider value={{fetchKoenigLexical, darkMode}}>
            <NiceModal.Provider>
                {children}
            </NiceModal.Provider>
        </DesignSystemContext.Provider>
    );
};

export default DesignSystemProvider;
