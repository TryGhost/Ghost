import React from 'react';
import {SettingsProvider} from './SettingsProvider';
import {UsersProvider} from './UsersProvider';

type DataProviderProps = {
    children: React.ReactNode;
};

const DataProvider: React.FC<DataProviderProps> = ({children}) => {
    return (
        <SettingsProvider>
            <UsersProvider>
                {children}
            </UsersProvider>
        </SettingsProvider>
    );
};

export default DataProvider;