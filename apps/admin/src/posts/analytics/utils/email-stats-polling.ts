import type { Query } from '@tanstack/react-query';
import type { Email } from '@tryghost/admin-x-framework/api/posts';

export type PollingEmail = Pick<Email, 'submitted_at' | 'status'>;

const SIXTY_MINS = 60 * 60 * 1000;
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
const FIVE_SECONDS = 5000;
const THIRTY_SECONDS = 30000;

export const getEmailStatsRefetchInterval = (email?: PollingEmail | null): 5000 | 30000 | false => {
  if (!email?.submitted_at || email.status === 'failed') {
    return false;
  }

  const emailAgeMs = Date.now() - Date.parse(email.submitted_at);
  if (!Number.isFinite(emailAgeMs) || emailAgeMs >= THREE_DAYS) {
    return false;
  }

  return emailAgeMs < SIXTY_MINS ? FIVE_SECONDS : THIRTY_SECONDS;
};

// Polling keeps running after a failed request, so it recovers on its own once
// the API is reachable again.
export const getEmailStatsPollingOptions = <Data>(
  getEmail: (data: Data | undefined) => PollingEmail | null | undefined,
) => ({
  refetchIntervalInBackground: false,
  refetchInterval: (query: Query<Data>) => getEmailStatsRefetchInterval(getEmail(query.state.data)),
});
