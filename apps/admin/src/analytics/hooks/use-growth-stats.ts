import moment from 'moment';
import {
  type MemberCountHistoryResponseType,
  type MemberStatusItem,
  type MrrHistoryItem,
  useMemberCountHistory,
  useMrrHistory,
  useSubscriptionStats,
} from '@tryghost/admin-x-framework/api/stats';
import { formatNumber, formatPercentage } from '@tryghost/shade/utils';
import { formatQueryDate, getRangeDates } from '@/shared/analytics/chart-helpers';
import { getSymbol } from '@tryghost/admin-x-framework';
import { useMemo } from 'react';

// Type for direction values
export type DiffDirection = 'up' | 'down' | 'same';

// Calculate totals from member data
const calculateTotals = ({
  memberData,
  mrrData,
  openingMember,
  openingMrr,
  memberCountTotals,
}: {
  memberData: MemberStatusItem[];
  mrrData: MrrHistoryItem[];
  openingMember?: MemberStatusItem;
  openingMrr?: number;
  memberCountTotals?: MemberCountHistoryResponseType['meta']['totals'];
}) => {
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

  // Use current totals from API meta if available, otherwise use latest time series data
  const latest = memberData[memberData.length - 1];
  const currentTotals = memberCountTotals ?? latest;

  const latestMrr = mrrData.length > 0 ? mrrData[mrrData.length - 1] : { mrr: 0 };

  // Calculate total members using current totals
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

  if (openingMember) {
    const openingPaid = openingMember.paid + openingMember.comped + (openingMember.gift ?? 0);
    const openingTotal = openingMember.free + openingPaid;

    if (openingTotal > 0) {
      const totalChange = ((totalMembers - openingTotal) / openingTotal) * 100;
      percentChanges.total = formatPercentage(totalChange / 100);
      directions.total = totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'same';
    }

    if (openingMember.free > 0) {
      const freeChange = ((latest.free - openingMember.free) / openingMember.free) * 100;
      percentChanges.free = formatPercentage(freeChange / 100);
      directions.free = freeChange > 0 ? 'up' : freeChange < 0 ? 'down' : 'same';
    }

    const latestPaidTotal = latest.paid + latest.comped + (latest.gift ?? 0);

    if (openingPaid > 0) {
      const paidChange = ((latestPaidTotal - openingPaid) / openingPaid) * 100;
      percentChanges.paid = formatPercentage(paidChange / 100);
      directions.paid = paidChange > 0 ? 'up' : paidChange < 0 ? 'down' : 'same';
    }
  }

  if (openingMrr !== undefined && openingMrr >= 0) {
    const mrrChange =
      openingMrr === 0 ? (totalMrr > 0 ? 1 : 0) : (totalMrr - openingMrr) / openingMrr;
    percentChanges.mrr = formatPercentage(mrrChange);
    directions.mrr = mrrChange > 0 ? 'up' : mrrChange < 0 ? 'down' : 'same';
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

export const useGrowthStats = (range: number) => {
  const { startDate, endDate } = useMemo(() => getRangeDates(range), [range]);
  const dateFrom = formatQueryDate(startDate);
  const openingBalanceDate = formatQueryDate(startDate.clone().subtract(1, 'day'));
  const todayEnd = range === 1 ? formatQueryDate(startDate.clone().add(1, 'day')) : undefined;
  const todayStart = todayEnd ? startDate.clone().utc() : undefined;
  const needsExactOpening = todayStart && !todayStart.isSame(todayStart.clone().startOf('day'));

  // Member history starts at date_from and each row contains closing balances.
  const { data: memberCountResponse, isLoading: isMemberCountLoading } = useMemberCountHistory({
    searchParams: {
      date_from: openingBalanceDate,
    },
  });

  const { data: mrrHistoryResponse, isLoading: isMrrLoading } = useMrrHistory({
    searchParams: {
      date_from: dateFrom,
      ...(todayStart ? { start_at: todayStart.format('YYYY-MM-DDTHH:mm:ss[Z]') } : {}),
    },
  });

  // Fetch subscription stats for real subscription events
  const { data: subscriptionStatsResponse, isLoading: isSubscriptionLoading } =
    useSubscriptionStats();

  const rawMemberData = useMemo<MemberStatusItem[]>(() => {
    if (memberCountResponse?.stats) {
      return memberCountResponse.stats;
    }
    return Array.isArray(memberCountResponse) ? memberCountResponse : [];
  }, [memberCountResponse]);

  const { memberData, openingMember } = useMemo(() => {
    if (todayEnd) {
      if (rawMemberData.length < 2) {
        return { memberData: rawMemberData };
      }

      // Draw Today's line from its opening balance to its closing balance.
      const [yesterdayData, todayData] = rawMemberData.slice(-2);
      return {
        openingMember: yesterdayData,
        memberData: [
          { ...yesterdayData, date: dateFrom },
          { ...todayData, date: todayEnd },
        ],
      };
    }

    return {
      memberData: rawMemberData.filter((item) => item.date >= dateFrom),
      openingMember: rawMemberData.find((item) => item.date === openingBalanceDate),
    };
  }, [rawMemberData, todayEnd, dateFrom, openingBalanceDate]);

  const {
    mrrData: dailyMrrData,
    todayMrrData: exactTodayMrrData,
    openingMrr: dailyOpeningMrr,
    currentMrr,
    selectedCurrency,
  } = useMemo(() => {
    const dateFromMoment = moment(dateFrom);
    // For "Today" range (1 day), use end of today to match visitor data behavior
    const dateToMoment = range === 1 ? moment().endOf('day') : moment().startOf('day');

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
      const openingAtStart = todayEnd
        ? mrrHistoryResponse.meta.opening_totals?.find((total) => total.currency === useCurrency)
        : undefined;
      const todayMrrData =
        todayEnd && openingAtStart
          ? [
              { ...openingAtStart, date: dateFrom },
              { ...currentMax, date: todayEnd },
            ]
          : undefined;

      // Filter MRR data to only include the selected currency
      const currencyFilteredData = mrrHistoryResponse.stats.filter(
        (d) => d.currency === useCurrency,
      );

      const allData = [...currencyFilteredData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      const openingPoint = allData.find((item) => item.date < dateFrom) ?? allData.at(-1);
      const latestPoint = allData[0];
      if (todayEnd && openingPoint && latestPoint.date >= dateFrom) {
        return {
          mrrData: [
            { ...openingPoint, date: dateFrom },
            { ...latestPoint, date: todayEnd },
          ],
          todayMrrData,
          openingMrr: openingPoint.mrr,
          currentMrr: currentMax.mrr,
          selectedCurrency: useCurrency,
        };
      }

      const result = currencyFilteredData.filter((item) => {
        return moment(item.date).isSameOrAfter(dateFromMoment);
      });

      // Always ensure we have a data point at the start of the range
      const hasStartPoint = result.some((item) => moment(item.date).isSame(dateFromMoment, 'day'));
      if (!hasStartPoint && openingPoint) {
        result.unshift({ ...openingPoint, date: dateFrom });
      }

      // Always ensure we have a data point at the end of the range
      const endDateToCheck = range === 1 ? moment().startOf('day') : dateToMoment;
      const hasEndPoint = result.some((item) => moment(item.date).isSame(endDateToCheck, 'day'));
      if (!hasEndPoint && result.length > 0) {
        // Use the most recent value in our result set
        const sortedResult = [...result].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const mostRecentValue = sortedResult[0];

        result.push({
          ...mostRecentValue,
          date: endDateToCheck.format('YYYY-MM-DD'),
        });
      }

      const finalResult = result.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      return {
        mrrData: finalResult,
        todayMrrData,
        openingMrr: openingPoint?.mrr,
        currentMrr: currentMax.mrr,
        selectedCurrency: useCurrency,
      };
    }
    return { mrrData: [], selectedCurrency: 'usd' };
  }, [mrrHistoryResponse, dateFrom, range, todayEnd]);
  const mrrData = exactTodayMrrData ?? dailyMrrData;
  // Older Core only provides a UTC-day opening balance.
  const mrrWithoutLocalOpening = needsExactOpening && !exactTodayMrrData ? currentMrr : undefined;
  const openingMrr =
    exactTodayMrrData?.[0].mrr ?? (needsExactOpening ? undefined : dailyOpeningMrr);

  // Calculate totals
  const totalsData = useMemo(() => {
    const totals = calculateTotals({
      memberData,
      mrrData,
      openingMember,
      openingMrr,
      memberCountTotals: memberCountResponse?.meta?.totals,
    });
    if (mrrWithoutLocalOpening === undefined) {
      return totals;
    }
    return {
      ...totals,
      mrr: mrrWithoutLocalOpening,
      percentChanges: { ...totals.percentChanges, mrr: '' },
      directions: { ...totals.directions, mrr: 'hidden' as const },
    };
  }, [
    memberData,
    mrrData,
    openingMember,
    openingMrr,
    memberCountResponse?.meta?.totals,
    mrrWithoutLocalOpening,
  ]);

  const chartData = useMemo(
    () => formatChartData(memberData, dailyMrrData),
    [memberData, dailyMrrData],
  );
  // UTC member rows can precede local Today. The exact MRR chart has its own two endpoints.
  const mrrChartData = useMemo(() => {
    if (mrrWithoutLocalOpening !== undefined) {
      return [];
    }
    return exactTodayMrrData ? formatChartData([], exactTodayMrrData) : chartData;
  }, [chartData, exactTodayMrrData, mrrWithoutLocalOpening]);

  // Get currency symbol
  const currencySymbol = useMemo(() => {
    return getSymbol(selectedCurrency);
  }, [selectedCurrency]);

  const isLoading = useMemo(
    () => isMemberCountLoading || isMrrLoading || isSubscriptionLoading,
    [isMemberCountLoading, isMrrLoading, isSubscriptionLoading],
  );

  // Process subscription data for real subscription events
  const subscriptionData = useMemo(() => {
    if (!subscriptionStatsResponse?.stats) {
      return [];
    }

    // Merge subscription stats by date
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
    memberData,
    mrrData,
    dateFrom,
    endDate,
    totals: totalsData,
    chartData,
    mrrChartData,
    // Today’s event counts belong to the API dates, before shifting the line chart points.
    memberChangeData: range === 1 ? rawMemberData : chartData,
    subscriptionData,
    selectedCurrency,
    currencySymbol,
  };
};
