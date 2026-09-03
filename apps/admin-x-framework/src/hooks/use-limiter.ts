import { useEffect, useMemo, useState } from 'react';
import { useBrowseConfig } from '../api/config';
import { useBrowseInvites } from '../api/invites';
import { useBrowseMembers } from '../api/members';
import { useBrowseNewsletters } from '../api/newsletters';
import { useBrowseRoles } from '../api/roles';
import { useBrowseUsers } from '../api/users';
import { HostLimitError } from '../utils/errors';
import type { Counter, GhostErrorOptions, LimitConfig } from '@tryghost/limit-service';

const limitServiceImport = import('@tryghost/limit-service');

// limit-service constructs its misconfiguration error with a single options object
class IncorrectUsageError extends Error {
  constructor({ message }: GhostErrorOptions) {
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

    const limiter = new LimitService();

    // How Admin counts, as opposed to how the server does. The limit service asks for a
    // number and neither side has to know how the other arrives at one.
    const counters: Record<string, Counter> = {
      staff: () => {
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

        return staffUsers.length + staffInvites.length;
      },

      members: async () => {
        const { data: members } = await fetchMembers();
        return members?.meta?.pagination?.total || 0;
      },

      newsletters: async () => {
        const { data: { pages } = { pages: [] } } = await fetchNewsletters();
        return pages[0].meta?.pagination.total || 0;
      },
    };

    limiter.loadLimits({
      limits: config.hostSettings.limits as Record<string, LimitConfig>,
      counters,
      helpLink,
      errors: {
        HostLimitError,
        IncorrectUsageError,
      },
    });

    return {
      isLimited: (limitName: string): boolean => limiter.isLimited(limitName),
      // Both answer `undefined` for a limit this site does not have, which every caller
      // already reads as falsy. Said explicitly now the package ships its own types; the
      // hand-written declarations this replaces claimed a plain boolean.
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
