import { WELCOME_EMAIL_SLUGS } from '@/automations/utils/default-welcome-email-values';
import { checkStripeEnabled, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseAutomations } from '@tryghost/admin-x-framework/api/automations';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import type { Config } from '@tryghost/admin-x-framework/api/config';

export const useVisibleAutomations = () => {
  const { data, error, isError, isLoading } = useBrowseAutomations({
    defaultErrorHandler: false,
    refetchOnMount: 'always',
    staleTime: 0,
  });
  const {
    data: settingsData,
    isLoading: isSettingsLoading,
    isFetching: isSettingsFetching,
  } = useBrowseSettings();
  const {
    data: configData,
    isLoading: isConfigLoading,
    isFetching: isConfigFetching,
  } = useBrowseConfig();

  const stripeEnabled = checkStripeEnabled(
    settingsData?.settings || [],
    (configData?.config || {}) as Config,
  );
  const automations = stripeEnabled
    ? data?.automations
    : data?.automations?.filter((automation) => automation.slug !== WELCOME_EMAIL_SLUGS.paid);

  return {
    automations,
    allAutomations: data?.automations,
    stripeEnabled,
    isStripeReady: !!settingsData && !!configData && !isSettingsFetching && !isConfigFetching,
    automationCount: data?.automations?.length,
    error,
    isError,
    isLoading: isLoading || isSettingsLoading || isConfigLoading,
  };
};
