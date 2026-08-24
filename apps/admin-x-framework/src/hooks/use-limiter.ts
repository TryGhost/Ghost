import { useEffect, useMemo, useState } from 'react';
import { useBrowseConfig } from '../api/config';
import { useBrowseInvites } from '../api/invites';
import { useBrowseMembers } from '../api/members';
import { useBrowseNewsletters } from '../api/newsletters';
import { useBrowseRoles } from '../api/roles';
import { useBrowseUsers } from '../api/users';
import { HostLimitError } from '../utils/errors';

const limitServiceImport = import('@tryghost/limit-service');

// limit-service constructs its misconfiguration error with a single options object
class IncorrectUsageError extends Error {
  constructor({ message }: { message: string }) {
    super(message);
  }
}

interface LimiterLimits {
  staff?: {
    max?: number;
    error?: string;
    currentCountQuery?: () => Promise<number>;
  };
  members?: {
    max?: number;
    error?: string;
    currentCountQuery?: () => Promise<number>;
  };
  newsletters?: {
    max?: number;
    error?: string;
    currentCountQuery?: () => Promise<number>;
  };
}

type PeriodicSubscription = {
  startDate: string;
  interval: 'month';
};

// limit-service resolves the period from this date with luxon's ISO parser. A value that
// parser can't read leaves the limit with no period to count against, so it registers but
// never fires, with nothing said about it. Anything not recognised here is treated as no
// anchor at all, which at least warns. This covers the extended ISO forms a subscription
// start arrives in, deliberately not the basic (20260821) or week-date (2026-W34-5) forms
// luxon would also take, so it errs towards the warning rather than the silent limit.
const ISO_START_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

// `Date.parse` normalises an impossible day instead of rejecting it — 2026-02-29 comes back
// as 2026-03-01 — so the calendar fields are checked on their own. Doing it on the date
// alone keeps this independent of any time or offset that follows it.
const isRealCalendarDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

const parseSubscriptionStart = (start?: string) => {
  if (!start) {
    return undefined;
  }

  const isoParts = ISO_START_DATE.exec(start);

  // `Date.parse` still covers what the calendar check can't see: an out-of-range time
  if (!isoParts || Number.isNaN(Date.parse(start))) {
    return undefined;
  }

  const [, year, month, day] = isoParts;

  return isRealCalendarDate(Number(year), Number(month), Number(day)) ? start : undefined;
};

// A periodic limit is built from the subscription that anchors its period, and
// registration stops at the first limit that throws — so one `maxPeriodic` limit with no
// subscription would take down every limit registered after it. Leave those out instead.
const usableLimits = (limits: Record<string, unknown>, subscription?: PeriodicSubscription) => {
  if (subscription) {
    return limits;
  }

  return Object.fromEntries(
    Object.entries(limits).filter(([name, limit]) => {
      if (limit && typeof limit === 'object' && 'maxPeriodic' in limit) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping ${name} limit: periodic limits need hostSettings.subscription`);
        return false;
      }

      return true;
    }),
  );
};

export interface Limiter {
  isLimited: (limitName: string) => boolean;
  isDisabled: (limitName: string) => boolean;
  checkWouldGoOverLimit: (limitName: string) => Promise<boolean>;
  errorIfWouldGoOverLimit: (limitName: string, metadata?: Record<string, unknown>) => Promise<void>;
  errorIfIsOverLimit: (limitName: string) => Promise<void>;
}

export const useLimiter = (): Limiter => {
  const { data: configData } = useBrowseConfig({ refetchOnMount: false });
  const config = configData?.config;
  const [LimitService, setLimitService] = useState<
    typeof import('@tryghost/limit-service').default | null
  >(null);

  useEffect(() => {
    void limitServiceImport.then((exports) => setLimitService(() => exports.default));
  }, []);

  const { data: { users } = { users: [] }, isLoading: usersLoading } = useBrowseUsers();
  const { data: { invites } = { invites: [] }, isLoading: invitesLoading } = useBrowseInvites();
  const { data: { roles } = {}, isLoading: rolesLoading } = useBrowseRoles();
  const isStaffLoading = usersLoading || invitesLoading || rolesLoading;
  const { refetch: fetchMembers } = useBrowseMembers({
    searchParams: { limit: '1' },
    enabled: false,
  });
  const { refetch: fetchNewsletters } = useBrowseNewsletters({
    searchParams: { filter: 'status:active', limit: '1' },
    enabled: false,
  });

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

    if (!LimitService || !config?.hostSettings?.limits || isStaffLoading) {
      return noOpLimiter;
    }

    // A subscription that can't anchor a period is treated as absent rather than built
    // into one that resolves to no period on the way to the count query
    const subscriptionStart = parseSubscriptionStart(config.hostSettings.subscription?.start);
    const subscription: PeriodicSubscription | undefined = subscriptionStart
      ? {
          startDate: subscriptionStart,
          interval: 'month',
        }
      : undefined;

    const limits = usableLimits({ ...config.hostSettings.limits }, subscription) as LimiterLimits;
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
      isDisabled: (limitName: string): boolean => limiter.isDisabled(limitName),
      checkWouldGoOverLimit: (limitName: string): Promise<boolean> =>
        limiter.checkWouldGoOverLimit(limitName),
      errorIfWouldGoOverLimit: (
        limitName: string,
        metadata: Record<string, unknown> = {},
      ): Promise<void> => limiter.errorIfWouldGoOverLimit(limitName, metadata),
      errorIfIsOverLimit: (limitName: string): Promise<void> =>
        limiter.errorIfIsOverLimit(limitName),
    };
  }, [
    LimitService,
    config,
    fetchMembers,
    fetchNewsletters,
    helpLink,
    invites,
    isStaffLoading,
    roles,
    users,
  ]);
};
