import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@src/components/providers/global-data-provider';

export const useShouldShowAdminForwardFlag = () => {
    const {settings} = useGlobalData();

    try {
        // Detect if we are running inside the React admin shell
        // In React shell: Ember renders to #ember-app
        // Standalone: Ember renders to body (no #ember-app element)
        const inAdminForward = document.querySelector('#ember-app') !== null;
        
        // If we are running inside the React admin shell and the admin forward
        // feature flag is not enabled, that means we have been opted in via the
        // config.labs.adminForward flag and that the site has been migrated.
        //
        // We need to check this way because the config backend merges the labs
        // settings overrides into the raw config, meaning we can't distinguish
        // between the feature flag being enabled via the settings and the
        // feature flag being enabled via the config.labs.adminForward flag.
        //
        // Thus, if you've been migrated without opting in, then we hide the
        // admin forward flag. If you have opted in, then we will show the admin
        // forward flag in the labs settings page regardless of the
        // config.labs.adminForward value.
        const adminForwardEnabled = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}')?.adminForward;
        return !adminForwardEnabled && inAdminForward;
    } catch {
        // If we can't parse the settings, we assume the site has not been migrated
        return false;
    }
};