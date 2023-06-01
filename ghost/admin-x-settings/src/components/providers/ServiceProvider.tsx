import React from 'react';
import setupGhostApi from '../../utils/api';
import {createContext} from 'react';

interface ServicesContextProps {
    api: ReturnType<typeof setupGhostApi>;
}

interface ServicesProviderProps {
    children: React.ReactNode;
    ghostVersion: string;
}

const ServicesContext = createContext<ServicesContextProps>({
    api: setupGhostApi({ghostVersion: ''})
});

const ServicesProvider: React.FC<ServicesProviderProps> = ({children, ghostVersion}) => {
    const apiService = setupGhostApi({ghostVersion});
    return (
        <ServicesContext.Provider value={{
            api: apiService
        }}>
            {children}
        </ServicesContext.Provider>
    );
};

export {ServicesContext, ServicesProvider};