import { useMemo } from 'react';
import { useBrowseConfig } from '../api/config';
import { useBrowseInvites } from '../api/invites';
import { useBrowseMembers } from '../api/members';
import { useBrowseNewsletters } from '../api/newsletters';
import { useBrowseRoles } from '../api/roles';
import { useBrowseUsers } from '../api/users';
import type { EmailsResponseType } from '../api/emails';
import { apiUrl, useFetchApi, type RequestOptions } from '../utils/api/fetch-api';
import { HostLimitError } from '../utils/errors';

import { LimitService, type LimitConfig } from '@tryghost/limit-service';

// limit-service constructs its misconfiguration error with a single options object
class IncorrectUsageError extends Error {
  constructor({ message }: { message: string }) {
    super(message);
  }
}

export interface Limiter {
  isLimited: (limitName: string) => boolean;
  isDisabled: (limitName: string) => boolean;
  checkWouldGoOverLimit: (limitName: string) => Promise<boolean>;
  errorIfWouldGoOverLimit: (limitName: string, metadata?: Record<string, unknown>) => Promise<void>;
  errorIfIsOverLimit: (limitName: string) => Promise<void>;
}

export interface UseLimiterOptions {
  /**
   * The limits this caller checks. Others are not loaded, and the staff lists are only read
   * when `staff` is named. Pass a referentially stable array: it is a memo dependency.
   */
  limits?: readonly string[];
  /** Applied to the count reads the limiter makes itself. */
  requestOptions?: Pick<RequestOptions, 'sessionExpiryRedirect'>;
}

/** Sums the recipients of the emails sent since the period started. */
function countEmailRecipients(emails: EmailsResponseType['emails']): number {
  return emails.reduce((total, email) => total + (email.email_count ?? 0), 0);
}

export const useLimiter = ({ limits: wanted, requestOptions }: UseLimiterOptions = {}): Limiter => {
  const { data: configData } = useBrowseConfig({ refetchOnMount: false });
  const config = configData?.config;
  const wantsStaff = !wanted || wanted.includes('staff');
  const { data: { users } = { users: [] }, isLoading: usersLoading } = useBrowseUsers({
    enabled: wantsStaff,
  });
  const { data: { invites } = { invites: [] }, isLoading: invitesLoading } = useBrowseInvites({
    enabled: wantsStaff,
  });
  const { data: { roles } = {}, isLoading: rolesLoading } = useBrowseRoles({
    enabled: wantsStaff,
  });
  const isStaffLoading = wantsStaff && (usersLoading || invitesLoading || rolesLoading);
  const { refetch: fetchMembers } = useBrowseMembers({
    searchParams: { limit: '1' },
    enabled: false,
    requestOptions,
  });
  const { refetch: fetchNewsletters } = useBrowseNewsletters({
    searchParams: { filter: 'status:active', limit: '1' },
    enabled: false,
    requestOptions,
  });
  const fetchApi = useFetchApi();
  const sessionExpiryRedirect = requestOptions?.sessionExpiryRedirect;

  const helpLink = useMemo(() => {
    if (config?.hostSettings?.billing?.enabled === true && config.hostSettings.billing.url) {
      return config.hostSettings.billing.url;
    } else {
      return 'https://ghost.org/help/';
    }
  }, [config?.hostSettings?.billing]);

  return useMemo(() => {
    // Return a stable no-op API when the limiter isn't ready
    // This prevents runtime errors while maintaining backward compatibility
    const noOpLimiter = {
      isLimited: (): boolean => false,
      isDisabled: (): boolean => false,
      checkWouldGoOverLimit: (): Promise<boolean> => Promise.resolve(false),
      errorIfWouldGoOverLimit: (): Promise<void> => Promise.resolve(),
      errorIfIsOverLimit: (): Promise<void> => Promise.resolve(),
    };

    if (!config?.hostSettings?.limits || isStaffLoading) {
      return noOpLimiter;
    }

    // A subscription without a start can't anchor a period, so it's treated as absent
    const subscriptionStart = config.hostSettings.subscription?.start;
    const subscription = subscriptionStart
      ? { startDate: subscriptionStart, interval: 'month' as const }
      : undefined;

    // Periodic limits need a subscription to build, and registration stops at the first
    // limit that throws, so without one they're skipped to keep the rest working
    const limits = Object.fromEntries(
      Object.entries(config.hostSettings.limits).filter(([name, limit]) => {
        if (wanted && !wanted.includes(name)) {
          return false;
        }
        if (!subscription && limit && Object.prototype.hasOwnProperty.call(limit, 'maxPeriodic')) {
          console.warn(`Skipping ${name} limit: periodic limits need hostSettings.subscription`); // eslint-disable-line no-console
          return false;
        }
        return true;
      }),
    ) as Record<string, LimitConfig>;
    const limiter = new LimitService();

    if (limits.staff) {
      limits.staff.currentCountQuery = () => {
        // Keep the existing first-page behavior for this move. Full pagination is tracked in
        // PLA-369 because excluded users/invites can push countable staff onto later pages.
        const staffUsers = users.filter(
          (user) =>
            user.status !== 'inactive' && !user.roles.some((role) => role.name === 'Contributor'),
        );
        const staffInvites = invites.filter((invite) => {
          const role = roles?.find(({ id }) => id === invite.role_id);
          return role?.name !== 'Contributor';
        });

        return Promise.resolve(staffUsers.length + staffInvites.length);
      };
    }

    if (limits.members) {
      limits.members.currentCountQuery = async () => {
        const { data: members } = await fetchMembers();
        return members?.meta?.pagination?.total || 0;
      };
    }

    if (limits.newsletters) {
      limits.newsletters.currentCountQuery = async () => {
        const { data: { pages } = { pages: [] } } = await fetchNewsletters();
        return pages[0].meta?.pagination.total || 0;
      };
    }

    if (limits.emails) {
      // The package's own emails query counts through knex, which the browser has no access to.
      limits.emails.currentCountQuery = async (_db, periodStart) => {
        const since = new Date(periodStart ?? 0).toISOString();
        const { emails } = await fetchApi<EmailsResponseType>(
          apiUrl('/emails/', {
            filter: `created_at:>='${since}'`,
            fields: 'id,email_count',
            limit: 'all',
          }),
          { sessionExpiryRedirect },
        );

        return countEmailRecipients(emails);
      };
    }

    limiter.loadLimits({
      limits,
      subscription,
      helpLink,
      errors: {
        HostLimitError,
        IncorrectUsageError,
      },
    });

    return {
      isLimited: (limitName: string): boolean => limiter.isLimited(limitName),
      isDisabled: (limitName: string): boolean => limiter.isDisabled(limitName) ?? false,
      checkWouldGoOverLimit: async (limitName: string): Promise<boolean> =>
        (await limiter.checkWouldGoOverLimit(limitName)) ?? false,
      errorIfWouldGoOverLimit: (
        limitName: string,
        metadata: Record<string, unknown> = {},
      ): Promise<void> => limiter.errorIfWouldGoOverLimit(limitName, metadata),
      errorIfIsOverLimit: (limitName: string): Promise<void> =>
        limiter.errorIfIsOverLimit(limitName),
    };
  }, [
    config,
    fetchApi,
    fetchMembers,
    fetchNewsletters,
    helpLink,
    invites,
    isStaffLoading,
    roles,
    sessionExpiryRedirect,
    users,
    wanted,
  ]);
};
