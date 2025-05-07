import moment from 'moment';
import {MemberStatusItem, MrrHistoryItem, useMemberCountHistory, useMrrHistory} from '@tryghost/admin-x-framework/api/stats';
import {formatNumber} from '@tryghost/shade';
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
    } else {
        // Specific range
        // Guard against invalid ranges
        const safeRange = Math.max(1, rangeInDays);
        dateFrom = moment.utc().subtract(safeRange - 1, 'days').format('YYYY-MM-DD');
    }

    return {dateFrom, endDate};
};

// Calculate totals from member data
const calculateTotals = (memberData: MemberStatusItem[], mrrData: MrrHistoryItem[]) => {
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
        const first = mrrData[0];
        const firstMrr = first.mrr;

        if (firstMrr > 0) {
            const mrrChange = ((totalMrr - firstMrr) / firstMrr) * 100;
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

    const mrrData = useMemo(() => {
        // HACK: We should do this filtering on the backend, but the API doesn't support it yet
        const dateFromMoment = moment(dateFrom).subtract(1, 'day');
        if (mrrHistoryResponse?.stats) {
            return mrrHistoryResponse.stats.filter((item) => {
                return moment(item.date).isSameOrAfter(dateFromMoment);
            });
        }
        return [];
    }, [mrrHistoryResponse, dateFrom]);

    // Calculate totals
    const totalsData = useMemo(() => calculateTotals(memberData, mrrData), [memberData, mrrData]);

    // Format chart data
    const chartData = useMemo(() => formatChartData(memberData, mrrData), [memberData, mrrData]);

    const isLoading = useMemo(() => isMemberCountLoading || isMrrLoading, [isMemberCountLoading, isMrrLoading]);

    return {
        isLoading,
        memberData,
        mrrData,
        dateFrom,
        endDate,
        totals: totalsData,
        chartData
    };
};
