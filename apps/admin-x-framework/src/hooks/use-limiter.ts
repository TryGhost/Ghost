import { useMemo } from 'react';
import { useBrowseConfig } from '../api/config';
import { useBrowseInvites } from '../api/invites';
import { useBrowseMembers } from '../api/members';
import { useBrowseNewsletters } from '../api/newsletters';
import { useBrowseRoles } from '../api/roles';
import { useBrowseUsers } from '../api/users';
import { HostLimitError } from '../utils/errors';

import { LimitService, type LimitConfig, type LimitName } from '@tryghost/limit-service';

// limit-service constructs its misconfiguration error with a single options object
class IncorrectUsageError extends Error {
  constructor({ message }: { message: string }) {
    super(message);
  }
}

// The set of limits callers may ask about, re-exported so Admin can name one without
// depending on the limit service directly.
export type { LimitName };

export interface Limiter {
  isLimited: (limitName: LimitName) => boolean;
  isDisabled: (limitName: LimitName) => boolean;
  checkWouldGoOverLimit: (limitName: LimitName) => Promise<boolean>;
  errorIfWouldGoOverLimit: (
    limitName: LimitName,
    metadata?: Record<string, unknown>,
  ) => Promise<void>;
  errorIfIsOverLimit: (limitName: LimitName) => Promise<void>;
}

export const useLimiter = (): Limiter => {
  const { data: configData } = useBrowseConfig({ refetchOnMount: false });
  const config = configData?.config;
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

    if (!config?.hostSettings?.limits || isStaffLoading) {
      return noOpLimiter;
    }

    const limits = { ...config.hostSettings.limits } as Record<string, LimitConfig>;
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
      helpLink,
      errors: {
        HostLimitError,
        IncorrectUsageError,
      },
    });

    return {
      isLimited: (limitName: LimitName): boolean => limiter.isLimited(limitName),
      isDisabled: (limitName: LimitName): boolean => limiter.isDisabled(limitName) ?? false,
      checkWouldGoOverLimit: async (limitName: LimitName): Promise<boolean> =>
        (await limiter.checkWouldGoOverLimit(limitName)) ?? false,
      errorIfWouldGoOverLimit: (
        limitName: LimitName,
        metadata: Record<string, unknown> = {},
      ): Promise<void> => limiter.errorIfWouldGoOverLimit(limitName, metadata),
      errorIfIsOverLimit: (limitName: LimitName): Promise<void> =>
        limiter.errorIfIsOverLimit(limitName),
    };
  }, [config, fetchMembers, fetchNewsletters, helpLink, invites, isStaffLoading, roles, users]);
};
