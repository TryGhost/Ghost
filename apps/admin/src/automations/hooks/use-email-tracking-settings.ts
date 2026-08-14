import {useAppContext} from '@tryghost/admin-x-framework';

export const useEmailTrackingSettings = () => {
    const {appSettings} = useAppContext();
    const {emailTrackOpens = false, emailTrackClicks = false} = appSettings?.analytics ?? {};

    return {emailTrackOpens, emailTrackClicks};
};
