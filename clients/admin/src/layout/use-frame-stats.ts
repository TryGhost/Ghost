import { useMemo } from 'react';
import { useActiveVisitors } from '@tryghost/admin-x-framework';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import {
  usePaidMembersEnabled,
  useWebAnalyticsEnabled,
} from '@tryghost/admin-x-framework/api/settings';
import {
  type MemberCountHistoryResponseType,
  type MrrHistoryResponseType,
  useMemberCountHistory,
  useMrrHistory,
} from '@tryghost/admin-x-framework/api/stats';
import { hasAdminAccess } from '@tryghost/admin-x-framework/api/users';

/** One of the top bar's numbers: `undefined` while it loads, `null` when it isn't shown. */
export type FrameStat<T> = T | null | undefined;

export interface FrameMrr {
  /** In the currency's minor unit (e.g. cents) */
  amount: number;
  currency: string;
}

export interface FrameStats {
  /** Visitors on the site in the last few minutes */
  online: FrameStat<number>;
  members: FrameStat<number>;
  /** Monthly recurring revenue */
  mrr: FrameStat<FrameMrr>;
}

/** All members right now, from the member count's current totals (as Growth counts them). */
export function totalMembers(response: MemberCountHistoryResponseType | undefined) {
  const totals = response?.meta?.totals;
  if (!totals) {
    return undefined;
  }
  return totals.free + totals.paid + totals.comped + (totals.gift ?? 0);
}

/** MRR right now, in the currency that brings in the most (as the Dashboard picks it). */
export function currentMrr(response: MrrHistoryResponseType | undefined): FrameMrr | undefined {
  const totals = response?.meta?.totals;
  if (!totals) {
    return undefined;
  }
  if (!totals.length) {
    return { amount: 0, currency: 'usd' };
  }
  const top = totals.reduce((max, total) => (total.mrr > max.mrr ? total : max));
  return { amount: top.mrr, currency: top.currency };
}

/**
 * The site's at-a-glance numbers for the frame's top bar. Only staff with
 * admin access see them (the stats endpoints are theirs, as Analytics is);
 * MRR only with paid members on, and visitors only with web analytics on. A
 * number that fails to load is left out rather than reported: the top bar is
 * on every screen.
 */
export function useFrameStats(): FrameStats {
  const { data: currentUser } = useCurrentUser();
  const canSeeStats = Boolean(currentUser && hasAdminAccess(currentUser));
  const paidMembersEnabled = usePaidMembersEnabled();
  const webAnalyticsEnabled = useWebAnalyticsEnabled();
  const statsConfig = useBrowseConfig().data?.config.stats;

  // The current totals come with any range; today's keeps the response small
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const memberCount = useMemberCountHistory({
    searchParams: { date_from: today },
    enabled: canSeeStats,
    defaultErrorHandler: false,
  });
  const mrrHistory = useMrrHistory({
    searchParams: { date_from: today },
    enabled: canSeeStats && paidMembersEnabled === true,
    defaultErrorHandler: false,
  });
  const showOnline = canSeeStats && webAnalyticsEnabled && Boolean(statsConfig);
  const activeVisitors = useActiveVisitors({ statsConfig, enabled: showOnline });

  if (!currentUser) {
    return { online: undefined, members: undefined, mrr: undefined };
  }
  if (!canSeeStats) {
    return { online: null, members: null, mrr: null };
  }

  let mrr: FrameStat<FrameMrr>;
  if (paidMembersEnabled === false || mrrHistory.isError) {
    mrr = null;
  } else {
    mrr = currentMrr(mrrHistory.data);
  }

  let online: FrameStat<number>;
  if (!showOnline || activeVisitors.error) {
    online = null;
  } else if (!activeVisitors.isLoading) {
    online = activeVisitors.activeVisitors;
  }

  return {
    online,
    members: memberCount.isError ? null : totalMembers(memberCount.data),
    mrr,
  };
}
