import moment from 'moment';
import {MemberStatusItem, MrrHistoryItem, useMemberCountHistory, useMrrHistory} from '@tryghost/admin-x-framework/api/stats';
import {formatNumber} from '@tryghost/shade';
import {getSymbol} from '@tryghost/admin-x-framework';
import {useMemo} from 'react';

// Type for direction values
export type DiffDirection = 'up' | 'down' | 'same';

// Helper function to convert range to date parameters
export const getRangeDates = (rangeInDays: number) => {
    // Always use UTC to stay aligned with the backend's date arithmetic
    const endDate = moment.utc().format('YYYY-MM-DD');
    let dateFrom;

    if (rangeInDays === 1) {
        // Today
        dateFrom = endDate;
    } else if (rangeInDays === 1000) {
        // All time - use a far past date
        dateFrom = '2010-01-01';
    } else if (rangeInDays === -1) {
        // Year to date - use January 1st of current year
        dateFrom = moment.utc().startOf('year').format('YYYY-MM-DD');
    } else {
        // Specific range
        // Guard against invalid ranges
        const safeRange = Math.max(1, rangeInDays);
        dateFrom = moment.utc().subtract(safeRange - 1, 'days').format('YYYY-MM-DD');
    }

    return {dateFrom, endDate};
};

// Calculate totals from member data
const calculateTotals = (memberData: MemberStatusItem[], mrrData: MrrHistoryItem[], dateFrom: string) => {
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

    // Get latest values
    const latest = memberData.length > 0 ? memberData[memberData.length - 1] : {free: 0, paid: 0, comped: 0};

    const latestMrr = mrrData.length > 0 ? mrrData[mrrData.length - 1] : {mrr: 0};

    // Calculate total members
    const totalMembers = latest.free + latest.paid + latest.comped;

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
            percentChanges.total = `${Math.abs(totalChange).toFixed(1)}%`;
            directions.total = totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'same';
        }

        if (first.free > 0) {
            const freeChange = ((latest.free - first.free) / first.free) * 100;
            percentChanges.free = `${Math.abs(freeChange).toFixed(1)}%`;
            directions.free = freeChange > 0 ? 'up' : freeChange < 0 ? 'down' : 'same';
        }

        if (first.paid > 0) {
            const paidChange = ((latest.paid - first.paid) / first.paid) * 100;
            percentChanges.paid = `${Math.abs(paidChange).toFixed(1)}%`;
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
            
            percentChanges.mrr = `${Math.abs(mrrChange).toFixed(1)}%`;
            directions.mrr = mrrChange > 0 ? 'up' : mrrChange < 0 ? 'down' : 'same';
        }
    }

    return {
        totalMembers,
        freeMembers: latest.free,
        paidMembers: latest.paid,
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
        const value = free + paid + comped;
        const mrr = lastMrrItem?.mrr ?? 0;

        return {
            date,
            value,
            free,
            paid,
            comped,
            mrr,
            formattedValue: formatNumber(value),
            label: 'Total members' // Consider if label needs update based on data type?
        };
    });
};

export const useGrowthStats = (range: number) => {
    // Calculate date range
    const {dateFrom, endDate} = useMemo(() => getRangeDates(range), [range]);

    // Fetch member count history from API
    const {data: memberCountResponse, isLoading: isMemberCountLoading} = useMemberCountHistory({
        searchParams: {
            date_from: dateFrom
        }
    });

    const {data: mrrHistoryResponse, isLoading: isMrrLoading} = useMrrHistory();

    // Process member data with stable reference
    const memberData = useMemo(() => {
        // Check the structure of the response and extract data
        if (memberCountResponse?.stats) {
            return memberCountResponse.stats;
        } else if (Array.isArray(memberCountResponse)) {
            // If response is directly an array
            return memberCountResponse;
        }
        return [];
    }, [memberCountResponse]);

    const {mrrData, selectedCurrency} = useMemo(() => {
        // HACK: We should do this filtering on the backend, but the API doesn't support it yet
        const dateFromMoment = moment(dateFrom).subtract(1, 'day');
        const dateToMoment = moment().startOf('day'); // Today
        
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
            
            // Always ensure we have a data point at the end of the range (today)
            const hasEndPoint = result.some(item => moment(item.date).isSame(dateToMoment, 'day'));
            if (!hasEndPoint && result.length > 0) {
                // Use the most recent value in our result set
                const sortedResult = [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const mostRecentValue = sortedResult[0];
                
                result.push({
                    ...mostRecentValue,
                    date: dateToMoment.format('YYYY-MM-DD')
                });
            }
            
            const finalResult = result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            return {mrrData: finalResult, selectedCurrency: useCurrency};
        }
        return {mrrData: [], selectedCurrency: 'usd'};
    }, [mrrHistoryResponse, dateFrom]);

    // Calculate totals
    const totalsData = useMemo(() => calculateTotals(memberData, mrrData, dateFrom), [memberData, mrrData, dateFrom]);

    // Format chart data
    const chartData = useMemo(() => formatChartData(memberData, mrrData), [memberData, mrrData]);

    // Get currency symbol
    const currencySymbol = useMemo(() => {
        return getSymbol(selectedCurrency);
    }, [selectedCurrency]);

    const isLoading = useMemo(() => isMemberCountLoading || isMrrLoading, [isMemberCountLoading, isMrrLoading]);

    return {
        isLoading,
        memberData,
        mrrData,
        dateFrom,
        endDate,
        totals: totalsData,
        chartData,
        selectedCurrency,
        currencySymbol
    };
};
