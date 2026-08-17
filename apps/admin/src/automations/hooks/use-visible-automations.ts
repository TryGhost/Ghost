import {WELCOME_EMAIL_SLUGS} from '@/automations/utils/default-welcome-email-values';
import {checkStripeEnabled, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseAutomations} from '@tryghost/admin-x-framework/api/automations';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import type {Config} from '@tryghost/admin-x-framework/api/config';

export const useVisibleAutomations = () => {
    const {data, error, isError, isLoading} = useBrowseAutomations({
        defaultErrorHandler: false
    });
    const {data: settingsData, isLoading: isSettingsLoading} = useBrowseSettings();
    const {data: configData, isLoading: isConfigLoading} = useBrowseConfig();

    const stripeEnabled = checkStripeEnabled(settingsData?.settings || [], (configData?.config || {}) as Config);
    const automations = stripeEnabled
        ? data?.automations
        : data?.automations?.filter(automation => automation.slug !== WELCOME_EMAIL_SLUGS.paid);

    return {
        automations,
        error,
        isError,
        isLoading: isLoading || isSettingsLoading || isConfigLoading
    };
};
