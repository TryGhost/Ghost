import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';

export const useAdminUiRedesign = () => {
    const {data: configData} = useBrowseConfig();

    return configData?.config?.labs?.adminUiRedesign === true;
};
