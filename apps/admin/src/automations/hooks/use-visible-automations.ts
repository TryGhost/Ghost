import { WELCOME_EMAIL_SLUGS } from '@/settings/api';
import { checkStripeEnabled, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseAutomations } from '@tryghost/admin-x-framework/api/automations';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import type { Config } from '@tryghost/admin-x-framework/api/config';
import { useStripeConnectedWithPrototype } from '@/automations/prototype/settings';

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

  // PROTOTYPE ONLY (NY-1750): the prototype menu's "Stripe connected" switch can stand in for the
  // site's setting, so a demo can show either kind of site. Don't merge.
  const stripeEnabled = useStripeConnectedWithPrototype(
    checkStripeEnabled(settingsData?.settings || [], (configData?.config || {}) as Config),
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
