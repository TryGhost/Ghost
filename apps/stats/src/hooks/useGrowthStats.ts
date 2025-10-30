import moment from 'moment';
import {MemberStatusItem, MrrHistoryItem, useMemberCountHistory, useMrrHistory, useSubscriptionStats} from '@tryghost/admin-x-framework/api/stats';
import {formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getSymbol} from '@tryghost/admin-x-framework';
import {useMemo} from 'react';

// Type for direction values
export type DiffDirection = 'up' | 'down' | 'same';

// Calculate totals from member data
const calculateTotals = (memberData: MemberStatusItem[], mrrData: MrrHistoryItem[], dateFrom: string, memberCountTotals?: {paid: number; free: number; comped: number}) => {
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
                mrr: '0%'
            },
            directions: {
                total: 'same' as DiffDirection,
                free: 'same' as DiffDirection,
                paid: 'same' as DiffDirection,
                mrr: 'same' as DiffDirection
            }
        };
    }

    // Use current totals from API meta if available (like Ember), otherwise use latest time series data
    const currentTotals = memberCountTotals || memberData[memberData.length - 1];
    const latest = memberData.length > 0 ? memberData[memberData.length - 1] : {free: 0, paid: 0, comped: 0};

    const latestMrr = mrrData.length > 0 ? mrrData[mrrData.length - 1] : {mrr: 0};

    // Calculate total members using current totals (like Ember dashboard)
    const totalMembers = currentTotals.free + currentTotals.paid + currentTotals.comped;

    const totalMrr = latestMrr.mrr;

    // Calculate percentage changes if we have enough data
    const percentChanges = {
        total: '0%',
        free: '0%',
        paid: '0%',
        mrr: '0%'
    };

    const directions = {
        total: 'same' as DiffDirection,
        free: 'same' as DiffDirection,
        paid: 'same' as DiffDirection,
        mrr: 'same' as DiffDirection
    };

    if (memberData.length > 1) {
        // Get first day in range
        const first = memberData[0];
        const firstTotal = first.free + first.paid + first.comped;

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

        const firstPaidTotal = first.paid + first.comped;
        const latestPaidTotal = latest.paid + latest.comped;
        
        if (firstPaidTotal > 0) {
            const paidChange = ((latestPaidTotal - firstPaidTotal) / firstPaidTotal) * 100;
            percentChanges.paid = formatPercentage(paidChange / 100);
            directions.paid = paidChange > 0 ? 'up' : paidChange < 0 ? 'down' : 'same';
        }
    }

    if (mrrData.length > 1) {
        // Find the first ACTUAL data point within the selected date range (not synthetic boundary points)
        const actualStartDate = moment(dateFrom).format('YYYY-MM-DD');
        const firstActualPoint = mrrData.find(point => moment(point.date).isSameOrAfter(actualStartDate));

        // Check if this is a "from beginning" range (like YTD) vs a recent range
        const isFromBeginningRange = moment(dateFrom).isSame(moment().startOf('year'), 'day') ||
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

        if (firstMrr >= 0) { // Allow 0 as a valid starting point
            const mrrChange = firstMrr === 0
                ? (totalMrr > 0 ? 100 : 0) // If starting from 0, any positive value is 100% increase
                : ((totalMrr - firstMrr) / firstMrr) * 100;

            percentChanges.mrr = formatPercentage(mrrChange / 100);
            directions.mrr = mrrChange > 0 ? 'up' : mrrChange < 0 ? 'down' : 'same';
        }
    }

    return {
        totalMembers,
        freeMembers: currentTotals.free,
        paidMembers: currentTotals.paid + currentTotals.comped,
        mrr: totalMrr,
        percentChanges,
        directions
    };
};

// Format chart data
const formatChartData = (memberData: MemberStatusItem[], mrrData: MrrHistoryItem[]) => {
    // Ensure data is sorted by date
    const sortedMemberData = [...memberData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const sortedMrrData = [...mrrData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const memberDates = sortedMemberData.map(item => item.date);
    const mrrDates = sortedMrrData.map(item => item.date);

    const allDates = [...new Set([...memberDates, ...mrrDates])].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    let lastMemberItem: MemberStatusItem | null = null;
    let lastMrrItem: MrrHistoryItem | null = null;

    const memberMap = new Map(sortedMemberData.map(item => [item.date, item]));
    const mrrMap = new Map(sortedMrrData.map(item => [item.date, item]));

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
        const paidTotal = paid + comped;
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
            mrr,
            paid_subscribed: paidSubscribed,
            paid_canceled: paidCanceled,
            formattedValue: formatNumber(value),
            label: 'Total members' // Consider if label needs update based on data type?
        };
    });
};

export const useGrowthStats = (range: number) => {
    // Calculate date range using Shade's timezone-aware getRangeDates
    const {startDate, endDate} = useMemo(() => getRangeDates(range), [range]);
    const dateFrom = formatQueryDate(startDate);

    // Fetch member count history from API
    // For single day ranges, we need at least 2 days of data to show a proper delta
    const memberDataStartDate = range === 1 ? moment(dateFrom).subtract(1, 'day').format('YYYY-MM-DD') : dateFrom;
    
    const {data: memberCountResponse, isLoading: isMemberCountLoading} = useMemberCountHistory({
        searchParams: {
            date_from: memberDataStartDate
        }
    });

    const {data: mrrHistoryResponse, isLoading: isMrrLoading} = useMrrHistory({
        searchParams: {
            date_from: memberDataStartDate
        }
    });

    // Fetch subscription stats for real subscription events
    const {data: subscriptionStatsResponse, isLoading: isSubscriptionLoading} = useSubscriptionStats();

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
        
        // For single day (Today), ensure we have two data points for a proper line
        if (range === 1 && rawData.length >= 2) {
            // We should have yesterday's data and today's data
            const yesterdayData = rawData[rawData.length - 2]; // Yesterday's EOD counts
            const todayData = rawData[rawData.length - 1]; // Today's EOD counts
            
            const startOfToday = moment(dateFrom).format('YYYY-MM-DD'); // 6/26
            const startOfTomorrow = moment(dateFrom).add(1, 'day').format('YYYY-MM-DD'); // 6/27
            
            // Create two data points:
            // 1. Yesterday's EOD count attributed to start of today (6/26)
            // 2. Today's EOD count attributed to start of tomorrow (6/27)
            const startPoint = {
                ...yesterdayData,
                date: startOfToday
            };
            
            const endPoint = {
                ...todayData,
                date: startOfTomorrow
            };
            
            return [startPoint, endPoint];
        }
        
        return rawData;
    }, [memberCountResponse, range, dateFrom]);

    const {mrrData, selectedCurrency} = useMemo(() => {
        const dateFromMoment = moment(dateFrom);
        // For "Today" range (1 day), use end of today to match visitor data behavior
        const dateToMoment = range === 1 ? moment().endOf('day') : moment().startOf('day');

        if (mrrHistoryResponse?.stats && mrrHistoryResponse?.meta?.totals) {
            // Select the currency with the highest total MRR value (same logic as Dashboard)
            const totals = mrrHistoryResponse.meta.totals;
            let currentMax = totals[0];
            if (!currentMax) {
                return {mrrData: [], selectedCurrency: 'usd'};
            }

            for (const total of totals) {
                if (total.mrr > currentMax.mrr) {
                    currentMax = total;
                }
            }

            const useCurrency = currentMax.currency;

            // Filter MRR data to only include the selected currency
            const currencyFilteredData = mrrHistoryResponse.stats.filter(d => d.currency === useCurrency);

            const filteredData = currencyFilteredData.filter((item) => {
                return moment(item.date).isSameOrAfter(dateFromMoment);
            });

            const allData = [...currencyFilteredData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const result = [...filteredData];

            // Always ensure we have a data point at the start of the range
            const hasStartPoint = result.some(item => moment(item.date).isSame(dateFromMoment, 'day'));
            if (!hasStartPoint) {
                const mostRecentBeforeRange = allData.find((item) => {
                    return moment(item.date).isBefore(dateFromMoment);
                });

                if (mostRecentBeforeRange) {
                    result.unshift({
                        ...mostRecentBeforeRange,
                        date: dateFromMoment.format('YYYY-MM-DD')
                    });
                }
            }

            // Always ensure we have a data point at the end of the range
            const endDateToCheck = range === 1 ? moment().startOf('day') : dateToMoment;
            const hasEndPoint = result.some(item => moment(item.date).isSame(endDateToCheck, 'day'));
            if (!hasEndPoint && result.length > 0) {
                // Use the most recent value in our result set
                const sortedResult = [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const mostRecentValue = sortedResult[0];

                result.push({
                    ...mostRecentValue,
                    date: endDateToCheck.format('YYYY-MM-DD')
                });
            }

            const finalResult = result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return {mrrData: finalResult, selectedCurrency: useCurrency};
        }
        return {mrrData: [], selectedCurrency: 'usd'};
    }, [mrrHistoryResponse, dateFrom, range]);

    // Calculate totals
    const totalsData = useMemo(() => calculateTotals(memberData, mrrData, dateFrom, memberCountResponse?.meta?.totals), [memberData, mrrData, dateFrom, memberCountResponse?.meta?.totals]);

    // Format chart data
    const chartData = useMemo(() => formatChartData(memberData, mrrData), [memberData, mrrData]);

    // Get currency symbol
    const currencySymbol = useMemo(() => {
        return getSymbol(selectedCurrency);
    }, [selectedCurrency]);

    const isLoading = useMemo(() => isMemberCountLoading || isMrrLoading || isSubscriptionLoading, [isMemberCountLoading, isMrrLoading, isSubscriptionLoading]);

    // Process subscription data for real subscription events (like Ember dashboard)
    const subscriptionData = useMemo(() => {
        if (!subscriptionStatsResponse?.stats) {
            return [];
        }

        // Merge subscription stats by date (like Ember's mergeStatsByDate)
        const mergedByDate = subscriptionStatsResponse.stats.reduce((acc, current) => {
            const dateKey = current.date;
            
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    date: dateKey,
                    signups: 0,
                    cancellations: 0
                };
            }
            
            acc[dateKey].signups += current.signups;
            acc[dateKey].cancellations += current.cancellations;
            
            return acc;
        }, {} as Record<string, {date: string; signups: number; cancellations: number}>);

        // Convert to array and sort by date
        const subscriptionArray = Object.values(mergedByDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
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
        subscriptionData,
        selectedCurrency,
        currencySymbol
    };
};
