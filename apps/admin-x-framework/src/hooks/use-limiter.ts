import { useMemo } from 'react';
import { useBrowseConfig } from '../api/config';
import { useBrowseInvites } from '../api/invites';
import { useBrowseMembers } from '../api/members';
import { useBrowseNewsletters } from '../api/newsletters';
import { useBrowseRoles } from '../api/roles';
import { useBrowseUsers } from '../api/users';
import { HostLimitError } from '../utils/errors';

import {
  LimitService,
  readHostSettings,
  type LimitName,
  type Limits,
} from '@tryghost/limit-service';

// limit-service constructs its misconfiguration error with a single options object
class IncorrectUsageError extends Error {
  constructor({ message }: { message: string }) {
    super(message);
  }
}

// The set of limits callers may ask about, and what answers them, re-exported so Admin can
// name either without depending on the limit service directly.
export type { LimitName, Limits };

export const useLimiter = (): Limits => {
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
    // Until the config and staff counts have loaded there is nothing to limit against. A
    // site with no limits answers the same questions, so callers get one shape throughout
    // rather than having to hold a hook that is sometimes not there yet.
    if (!config?.hostSettings?.limits || isStaffLoading) {
      return LimitService.unlimited({ HostLimitError, IncorrectUsageError });
    }

    // Host settings arrive as whatever the API sent, so they are read rather than assumed,
    // and a limit that cannot be used is set aside rather than thrown: Admin would
    // otherwise go blank over a limit a publisher cannot do anything about. What was set
    // aside is not reported here, because the server reads the same host settings and logs
    // every one of them where it can be alerted on.
    const { settings } = readHostSettings(config.hostSettings);

    return new LimitService({
      settings,
      helpLink,
      // How to count is behaviour, not configuration: a browser asks the API for a number
      // the server would have asked the database for.
      currentCountQueries: {
        staff: () => {
          // Keep the existing first-page behavior for this move. Full pagination is tracked
          // in PLA-369 because excluded users/invites can push countable staff onto later
          // pages.
          const staffUsers = users.filter(
            (user) =>
              user.status !== 'inactive' && !user.roles.some((role) => role.name === 'Contributor'),
          );
          const staffInvites = invites.filter((invite) => {
            const role = roles?.find(({ id }) => id === invite.role_id);
            return role?.name !== 'Contributor';
          });

          return Promise.resolve(staffUsers.length + staffInvites.length);
        },
        members: async () => {
          const { data: members } = await fetchMembers();
          return members?.meta?.pagination?.total || 0;
        },
        newsletters: async () => {
          const { data: { pages } = { pages: [] } } = await fetchNewsletters();
          return pages[0].meta?.pagination.total || 0;
        },
      },
      errors: { HostLimitError, IncorrectUsageError },
    });
  }, [config, fetchMembers, fetchNewsletters, helpLink, invites, isStaffLoading, roles, users]);
};
