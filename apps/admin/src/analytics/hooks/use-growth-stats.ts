import moment from 'moment';
import {
  type MemberStatusItem,
  type MrrHistoryItem,
  useMemberCountHistory,
  useMrrHistory,
  useSubscriptionStats,
} from '@tryghost/admin-x-framework/api/stats';
import { formatNumber, formatPercentage } from '@tryghost/shade/utils';
import {
  type StatsRange,
  formatQueryDate,
  getRangeDates,
  getSingleDay,
} from '@/shared/analytics/chart-helpers';
import { getSymbol } from '@tryghost/admin-x-framework';
import { useMemo } from 'react';

// Type for direction values
export type DiffDirection = 'up' | 'down' | 'same';

type MemberCountTotals = { paid: number; free: number; comped: number; gift: number };

// Calculate totals from member data
const calculateTotals = (
  memberData: MemberStatusItem[],
  mrrData: MrrHistoryItem[],
  dateFrom: string,
  memberCountTotals?: { paid: number; free: number; comped: number; gift: number },
  // Where a single day started, when it came back hour by hour: each hour holds
  // the totals at its end, so the day's change is measured from here
  dayStart?: { members?: MemberCountTotals; mrr?: number },
) => {
  if (!memberData.length) {
    return {
      totalMembers: 0,
      freeMembers: 0,
      paidMembers: 0,
      mrr: 0,
      percentChanges: {
        total: '0%',
        free: '0%',
        paid: '0%',
        mrr: '0%',
      },
      directions: {
        total: 'same' as DiffDirection,
        free: 'same' as DiffDirection,
        paid: 'same' as DiffDirection,
        mrr: 'same' as DiffDirection,
      },
    };
  }

  // Use current totals from API meta if available (like Ember), otherwise use latest time series data
  const currentTotals = memberCountTotals || memberData[memberData.length - 1];
  const latest =
    memberData.length > 0
      ? memberData[memberData.length - 1]
      : { free: 0, paid: 0, comped: 0, gift: 0 };

  const latestMrr = mrrData.length > 0 ? mrrData[mrrData.length - 1] : { mrr: 0 };

  // Calculate total members using current totals (like Ember dashboard)
  const totalMembers =
    currentTotals.free + currentTotals.paid + currentTotals.comped + (currentTotals.gift ?? 0);

  const totalMrr = latestMrr.mrr;

  // Calculate percentage changes if we have enough data
  const percentChanges = {
    total: '0%',
    free: '0%',
    paid: '0%',
    mrr: '0%',
  };

  const directions = {
    total: 'same' as DiffDirection,
    free: 'same' as DiffDirection,
    paid: 'same' as DiffDirection,
    mrr: 'same' as DiffDirection,
  };

  if (dayStart?.members || memberData.length > 1) {
    // Where the range started: the day's opening totals, or the first day
    const first = dayStart?.members ?? memberData[0];
    const firstTotal = first.free + first.paid + first.comped + (first.gift ?? 0);

    if (firstTotal > 0) {
      const totalChange = ((totalMembers - firstTotal) / firstTotal) * 100;
      percentChanges.total = formatPercentage(totalChange / 100);
      directions.total = totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'same';
    }

    if (first.free > 0) {
      const freeChange = ((latest.free - first.free) / first.free) * 100;
      percentChanges.free = formatPercentage(freeChange / 100);
      directions.free = freeChange > 0 ? 'up' : freeChange < 0 ? 'down' : 'same';
    }

    const firstPaidTotal = first.paid + first.comped + (first.gift ?? 0);
    const latestPaidTotal = latest.paid + latest.comped + (latest.gift ?? 0);

    if (firstPaidTotal > 0) {
      const paidChange = ((latestPaidTotal - firstPaidTotal) / firstPaidTotal) * 100;
      percentChanges.paid = formatPercentage(paidChange / 100);
      directions.paid = paidChange > 0 ? 'up' : paidChange < 0 ? 'down' : 'same';
    }
  }

  if (dayStart?.mrr !== undefined) {
    const mrrChange =
      dayStart.mrr === 0
        ? totalMrr > 0
          ? 100
          : 0
        : ((totalMrr - dayStart.mrr) / dayStart.mrr) * 100;
    percentChanges.mrr = formatPercentage(mrrChange / 100);
    directions.mrr = mrrChange > 0 ? 'up' : mrrChange < 0 ? 'down' : 'same';
  } else if (mrrData.length > 1) {
    // Find the first ACTUAL data point within the selected date range (not synthetic boundary points)
    const actualStartDate = moment(dateFrom).format('YYYY-MM-DD');
    const firstActualPoint = mrrData.find((point) =>
      moment(point.date).isSameOrAfter(actualStartDate),
    );

    // Check if this is a "from beginning" range (like YTD) vs a recent range
    const isFromBeginningRange =
      moment(dateFrom).isSame(moment().startOf('year'), 'day') ||
      moment(dateFrom).year() < moment().year();

    let firstMrr = 0;

    if (firstActualPoint) {
      // Check if the first actual point is exactly at the start date
      if (moment(firstActualPoint.date).isSame(actualStartDate, 'day')) {
        firstMrr = firstActualPoint.mrr;
      } else {
        // First actual point is later than start date
        if (isFromBeginningRange) {
          // For YTD/beginning ranges, assume started from 0
          firstMrr = 0;
        } else {
          // For recent ranges, use the most recent MRR before the range
          // This should be the same as current MRR (flat line scenario)
          firstMrr = totalMrr;
        }
      }
    } else if (isFromBeginningRange) {
      // No data points in range, and it's a from-beginning range
      firstMrr = 0;
    } else {
      // No data points in recent range, carry forward current MRR
      firstMrr = totalMrr;
    }

    if (firstMrr >= 0) {
      // Allow 0 as a valid starting point
      const mrrChange =
        firstMrr === 0
          ? totalMrr > 0
            ? 100
            : 0 // If starting from 0, any positive value is 100% increase
          : ((totalMrr - firstMrr) / firstMrr) * 100;

      percentChanges.mrr = formatPercentage(mrrChange / 100);
      directions.mrr = mrrChange > 0 ? 'up' : mrrChange < 0 ? 'down' : 'same';
    }
  }

  return {
    totalMembers,
    freeMembers: currentTotals.free,
    paidMembers: currentTotals.paid + currentTotals.comped + (currentTotals.gift ?? 0),
    mrr: totalMrr,
    percentChanges,
    directions,
  };
};

// Format chart data
const formatChartData = (memberData: MemberStatusItem[], mrrData: MrrHistoryItem[]) => {
  // Ensure data is sorted by date
  const sortedMemberData = [...memberData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const sortedMrrData = [...mrrData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const memberDates = sortedMemberData.map((item) => item.date);
  const mrrDates = sortedMrrData.map((item) => item.date);

  const allDates = [...new Set([...memberDates, ...mrrDates])].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  let lastMemberItem: MemberStatusItem | null = null;
  let lastMrrItem: MrrHistoryItem | null = null;

  const memberMap = new Map(sortedMemberData.map((item) => [item.date, item]));
  const mrrMap = new Map(sortedMrrData.map((item) => [item.date, item]));

  return allDates.map((date) => {
    const currentMemberItem = memberMap.get(date);
    if (currentMemberItem) {
      lastMemberItem = currentMemberItem;
    }

    const currentMrrItem = mrrMap.get(date);
    if (currentMrrItem) {
      lastMrrItem = currentMrrItem;
    }

    const free = lastMemberItem?.free ?? 0;
    const paid = lastMemberItem?.paid ?? 0;
    const comped = lastMemberItem?.comped ?? 0;
    const gift = lastMemberItem?.gift ?? 0;
    const paidTotal = paid + comped + gift;
    const value = free + paidTotal;
    const mrr = lastMrrItem?.mrr ?? 0;
    const paidSubscribed = lastMemberItem?.paid_subscribed ?? 0;
    const paidCanceled = lastMemberItem?.paid_canceled ?? 0;

    return {
      date,
      value,
      free,
      paid: paidTotal,
      comped,
      gift,
      mrr,
      paid_subscribed: paidSubscribed,
      paid_canceled: paidCanceled,
      formattedValue: formatNumber(value),
      label: 'Total members', // Consider if label needs update based on data type?
    };
  });
};

// Servers that can answer a single day by the hour say so in the response
export const hasHourlyInterval = (response: unknown): boolean =>
  (response as { meta?: { interval?: string } } | undefined)?.meta?.interval === 'hour';

export const useGrowthStats = (range: StatsRange) => {
  // Calculate date range using Shade's timezone-aware getRangeDates
  const { startDate, endDate, timezone } = useMemo(() => getRangeDates(range), [range]);
  const dateFrom = formatQueryDate(startDate);
  const dateTo = formatQueryDate(endDate);
  const singleDay = getSingleDay(range);
  const isSingleDay = singleDay !== null;
  // The history endpoints always run up to today, so a custom range that
  // ends earlier has to be trimmed to its end date
  const endsBeforeToday = endDate.isBefore(moment(), 'day');

  // Fetch member count history from API
  // For single day ranges, we need at least 2 days of data to show a proper delta
  const memberDataStartDate = isSingleDay
    ? moment(dateFrom).subtract(1, 'day').format('YYYY-MM-DD')
    : dateFrom;

  // Days follow the viewer's timezone, like visitors, and a single day also
  // asks for its totals by the hour (date_to's day). Older servers ignore
  // both and answer by UTC day
  const historyParams: Record<string, string> = singleDay
    ? { date_from: memberDataStartDate, date_to: singleDay, interval: 'hour', timezone }
    : { date_from: memberDataStartDate, timezone };

  const { data: memberCountResponse, isLoading: isMemberCountLoading } = useMemberCountHistory({
    searchParams: historyParams,
  });

  const { data: mrrHistoryResponse, isLoading: isMrrLoading } = useMrrHistory({
    searchParams: historyParams,
  });

  const isHourly = isSingleDay && hasHourlyInterval(memberCountResponse);
  const isMrrHourly = isSingleDay && hasHourlyInterval(mrrHistoryResponse);

  // Fetch subscription stats for real subscription events
  const { data: subscriptionStatsResponse, isLoading: isSubscriptionLoading } =
    useSubscriptionStats();

  // Process member data with stable reference
  const memberData = useMemo(() => {
    let rawData: MemberStatusItem[] = [];

    // Check the structure of the response and extract data
    if (memberCountResponse?.stats) {
      rawData = memberCountResponse.stats;
    } else if (Array.isArray(memberCountResponse)) {
      // If response is directly an array
      rawData = memberCountResponse;
    }

    // Hourly history is already the day's hours, start to end
    if (isHourly) {
      return rawData;
    }

    if (endsBeforeToday) {
      rawData = rawData.filter((item) => item.date <= dateTo);
    }

    // Older servers answer a single day with two daily totals: chart them at
    // the start of the day and the next
    if (isSingleDay && rawData.length >= 2) {
      // We should have the previous day's data and the selected day's data
      const yesterdayData = rawData[rawData.length - 2]; // Previous day's EOD counts
      const todayData = rawData[rawData.length - 1]; // Selected day's EOD counts

      const startOfToday = moment(dateFrom).format('YYYY-MM-DD'); // 6/26
      const startOfTomorrow = moment(dateFrom).add(1, 'day').format('YYYY-MM-DD'); // 6/27

      // Create two data points:
      // 1. Yesterday's EOD count attributed to start of today (6/26)
      // 2. Today's EOD count attributed to start of tomorrow (6/27)
      const startPoint = {
        ...yesterdayData,
        date: startOfToday,
      };

      const endPoint = {
        ...todayData,
        date: startOfTomorrow,
      };

      return [startPoint, endPoint];
    }

    return rawData;
  }, [memberCountResponse, isHourly, isSingleDay, endsBeforeToday, dateFrom, dateTo]);

  const { mrrData, selectedCurrency } = useMemo(() => {
    const dateFromMoment = moment(dateFrom);
    const rangeEnd = moment(dateTo);

    if (mrrHistoryResponse?.stats && mrrHistoryResponse?.meta?.totals) {
      // Select the currency with the highest total MRR value (same logic as Dashboard)
      const totals = mrrHistoryResponse.meta.totals;
      let currentMax = totals[0];
      if (!currentMax) {
        return { mrrData: [], selectedCurrency: 'usd' };
      }

      for (const total of totals) {
        if (total.mrr > currentMax.mrr) {
          currentMax = total;
        }
      }

      const useCurrency = currentMax.currency;

      // Filter MRR data to only include the selected currency
      const currencyFilteredData = mrrHistoryResponse.stats.filter(
        (d) => d.currency === useCurrency,
      );

      // Hourly history already covers every hour of the day
      if (isMrrHourly) {
        return { mrrData: currencyFilteredData, selectedCurrency: useCurrency };
      }

      // MRR rows are dated by UTC day, so a range ending today keeps rows
      // dated after the viewer's local today (evening west of UTC)
      const filteredData = currencyFilteredData.filter((item) => {
        return (
          moment(item.date).isSameOrAfter(dateFromMoment) &&
          (!endsBeforeToday || moment(item.date).isSameOrBefore(rangeEnd, 'day'))
        );
      });

      const allData = [...currencyFilteredData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      const result = [...filteredData];

      // Always ensure we have a data point at the start of the range
      const hasStartPoint = result.some((item) => moment(item.date).isSame(dateFromMoment, 'day'));
      if (!hasStartPoint) {
        const mostRecentBeforeRange = allData.find((item) => {
          return moment(item.date).isBefore(dateFromMoment);
        });

        if (mostRecentBeforeRange) {
          result.unshift({
            ...mostRecentBeforeRange,
            date: dateFromMoment.format('YYYY-MM-DD'),
          });
        } else if (result.length > 0) {
          // No data before range, use the earliest data point in the range
          // to fill in the start date (representing MRR at range start)
          const earliestInRange = [...result].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          )[0];
          result.unshift({
            ...earliestInRange,
            date: dateFromMoment.format('YYYY-MM-DD'),
          });
        }
      }

      // Always ensure we have a data point at the end of the range
      const hasEndPoint = result.some((item) => moment(item.date).isSame(rangeEnd, 'day'));
      if (!hasEndPoint && result.length > 0) {
        // Use the most recent value in our result set
        const sortedResult = [...result].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const mostRecentValue = sortedResult[0];

        result.push({
          ...mostRecentValue,
          date: rangeEnd.format('YYYY-MM-DD'),
        });
      }

      const finalResult = result.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      return { mrrData: finalResult, selectedCurrency: useCurrency };
    }
    return { mrrData: [], selectedCurrency: 'usd' };
  }, [mrrHistoryResponse, isMrrHourly, dateFrom, dateTo, endsBeforeToday]);

  // Current totals only describe a range that ends today; earlier ranges use
  // the counts on their last day
  const currentTotals = endsBeforeToday ? undefined : memberCountResponse?.meta?.totals;

  // Where a single day started, from hourly history
  const dayStart = useMemo(() => {
    const members = isHourly
      ? (memberCountResponse as { meta?: { start?: MemberCountTotals } } | undefined)?.meta?.start
      : undefined;
    const mrrStarts = isMrrHourly
      ? (
          mrrHistoryResponse as
            | { meta?: { start?: { currency: string; mrr: number }[] } }
            | undefined
        )?.meta?.start
      : undefined;
    const mrr = mrrStarts?.find((start) => start.currency === selectedCurrency)?.mrr;
    // MRR stays in cents, like the totals it's compared with
    return { members, mrr };
  }, [isHourly, isMrrHourly, memberCountResponse, mrrHistoryResponse, selectedCurrency]);

  // Calculate totals
  const totalsData = useMemo(
    () => calculateTotals(memberData, mrrData, dateFrom, currentTotals, dayStart),
    [memberData, mrrData, dateFrom, currentTotals],
  );

  // Format chart data
  const chartData = useMemo(() => formatChartData(memberData, mrrData), [memberData, mrrData]);

  // Get currency symbol
  const currencySymbol = useMemo(() => {
    return getSymbol(selectedCurrency);
  }, [selectedCurrency]);

  const isLoading = useMemo(
    () => isMemberCountLoading || isMrrLoading || isSubscriptionLoading,
    [isMemberCountLoading, isMrrLoading, isSubscriptionLoading],
  );

  // Process subscription data for real subscription events (like Ember dashboard)
  const subscriptionData = useMemo(() => {
    if (!subscriptionStatsResponse?.stats) {
      return [];
    }

    // Merge subscription stats by date (like Ember's mergeStatsByDate)
    const mergedByDate = subscriptionStatsResponse.stats.reduce(
      (acc, current) => {
        const dateKey = current.date;

        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            signups: 0,
            cancellations: 0,
          };
        }

        acc[dateKey].signups += current.signups;
        acc[dateKey].cancellations += current.cancellations;

        return acc;
      },
      {} as Record<string, { date: string; signups: number; cancellations: number }>,
    );

    // Convert to array and sort by date
    const subscriptionArray = Object.values(mergedByDate).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Filter to requested date range
    const dateFromMoment = moment(dateFrom);
    const dateToMoment = moment(endDate);
    return subscriptionArray.filter((item) => {
      const itemDate = moment(item.date);
      return itemDate.isSameOrAfter(dateFromMoment) && itemDate.isSameOrBefore(dateToMoment);
    });
  }, [subscriptionStatsResponse, dateFrom, endDate]);

  return {
    isLoading,
    // A single day came back hour by hour, so it charts with times
    isHourly,
    memberData,
    mrrData,
    dateFrom,
    endDate,
    totals: totalsData,
    chartData,
    subscriptionData,
    selectedCurrency,
    currencySymbol,
  };
};
