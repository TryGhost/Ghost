import { useMemo, useRef } from 'react';
import { useBrowseConfig, type Config } from '@tryghost/admin-x-framework/api/config';
import { getSettingValue, type Setting } from '@tryghost/admin-x-framework/api/settings';
import { useLimiter } from '@tryghost/admin-x-framework/hooks';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { useEditorSettings } from '@/editor/use-editor-settings';
import type { EmailVerificationHold, PublishLimitPorts } from './publish-options';

/** The host limits the flow checks: members before publishing, emails before sending. */
const PUBLISH_LIMITS = ['members', 'emails'] as const;

/** The sending hold as the settings and the host's config describe it. */
export function readEmailVerificationHold(
  settings: Setting[] | null | undefined,
  config: Config | undefined,
): EmailVerificationHold {
  return {
    required: getSettingValue<boolean>(settings, 'email_verification_required') === true,
    message: config?.hostSettings?.emailVerification?.emailSendingDisabledMessage ?? null,
  };
}

/** The machine captures these ports once, so each reads the latest hook values when it runs. */
export function usePublishLimits(): PublishLimitPorts {
  const limiter = useLimiter({ limits: PUBLISH_LIMITS, requestOptions: EDITOR_REQUEST_OPTIONS });
  const settingsQuery = useEditorSettings();
  const { data: configData } = useBrowseConfig({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const latest = useRef({ limiter, settingsQuery, config: configData?.config });
  latest.current = { limiter, settingsQuery, config: configData?.config };
  // What the refresh read, so the hold is judged on the settings it fetched.
  const refreshed = useRef<Setting[] | null>(null);

  return useMemo<PublishLimitPorts>(
    () => ({
      async refreshSettings() {
        const { data } = await latest.current.settingsQuery.refetch({ throwOnError: true });
        refreshed.current = data?.settings ?? null;
      },
      async checkSendingLimit() {
        const { limiter: current } = latest.current;

        if (current.isLimited('emails')) {
          await current.errorIfWouldGoOverLimit('emails');
        }
      },
      async checkPublishingLimit() {
        const { limiter: current } = latest.current;

        if (current.isLimited('members')) {
          await current.errorIfIsOverLimit('members');
        }
      },
      getEmailVerification() {
        return readEmailVerificationHold(
          refreshed.current ?? latest.current.settingsQuery.data?.settings,
          latest.current.config,
        );
      },
    }),
    [],
  );
}
