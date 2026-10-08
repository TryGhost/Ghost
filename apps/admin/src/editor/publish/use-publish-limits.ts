import { useMemo, useRef } from 'react';
import { useQueryClient, type QueryState } from '@tanstack/react-query';
import { useBrowseConfig, type Config } from '@tryghost/admin-x-framework/api/config';
import { getMemberCountQueryKey } from '@tryghost/admin-x-framework/api/members';
import { getSettingValue, type Setting } from '@tryghost/admin-x-framework/api/settings';
import { HostLimitError } from '@tryghost/admin-x-framework/errors';
import { useLimiter } from '@tryghost/admin-x-framework/hooks';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { useEditorSettings } from '@/editor/use-editor-settings';
import { LimitCheckError } from './publish-options';
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

/**
 * Only a `HostLimitError` is a limit that was reached. Anything else the limiter
 * rejects with means the limit could not be checked, such as the count read failing.
 */
export function rethrowLimitRejection(limit: 'emails' | 'members', error: unknown): never {
  if (error instanceof HostLimitError) {
    throw error;
  }
  throw new LimitCheckError(limit, error);
}

/**
 * The framework's limiter counts members through the member-count query and
 * reads a failed read as zero, which passes the check. The query's state shows
 * whether the count it just made failed, so the check can be failed closed.
 */
export function memberCountReadError(
  state: Pick<QueryState, 'status' | 'error' | 'errorUpdatedAt'> | undefined,
  since: number,
): unknown {
  return state?.status === 'error' && state.errorUpdatedAt >= since ? state.error : null;
}

/** The machine captures these ports once, so each reads the latest hook values when it runs. */
export function usePublishLimits(): PublishLimitPorts {
  const limiter = useLimiter({ limits: PUBLISH_LIMITS, requestOptions: EDITOR_REQUEST_OPTIONS });
  const queryClient = useQueryClient();
  const settingsQuery = useEditorSettings();
  const { data: configData } = useBrowseConfig({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const latest = useRef({ limiter, settingsQuery, queryClient, config: configData?.config });
  latest.current = { limiter, settingsQuery, queryClient, config: configData?.config };
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
          await current
            .errorIfWouldGoOverLimit('emails')
            .catch((error: unknown) => rethrowLimitRejection('emails', error));
        }
      },
      async checkPublishingLimit() {
        const { limiter: current, queryClient: client } = latest.current;

        if (current.isLimited('members')) {
          const startedAt = Date.now();

          await current
            .errorIfIsOverLimit('members')
            .catch((error: unknown) => rethrowLimitRejection('members', error));

          const readError = memberCountReadError(
            client.getQueryState(getMemberCountQueryKey()),
            startedAt,
          );

          if (readError) {
            throw new LimitCheckError('members', readError);
          }
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
