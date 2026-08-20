import {type Config} from '@tryghost/admin-x-framework/api/config';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {type SiteData} from '@tryghost/admin-x-framework/api/site';
import {type User} from '@tryghost/admin-x-framework/api/users';
import {createContext, useContext} from 'react';

export interface GlobalData {
    settings: Setting[]
    siteData: SiteData
    config: Config
    currentUser: User
}

export const GlobalDataContext = createContext<GlobalData | undefined>(undefined);

export const useGlobalData = () => useContext(GlobalDataContext)!;
