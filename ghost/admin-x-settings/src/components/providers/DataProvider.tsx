import React from 'react';
import {RolesProvider} from './RolesProvider';
import {SettingsProvider} from './SettingsProvider';
import {UsersProvider} from './UsersProvider';

type DataProviderProps = {
    children: React.ReactNode;
};

const DataProvider: React.FC<DataProviderProps> = ({children}) => {
    return (
        <SettingsProvider>
            <UsersProvider>
                <RolesProvider>
                    {children}
                </RolesProvider>
            </UsersProvider>
        </SettingsProvider>
    );
};

export default DataProvider;