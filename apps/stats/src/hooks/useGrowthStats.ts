import moment from 'moment';
import {MemberStatusItem, useMemberCountHistory} from '@tryghost/admin-x-framework/api/stats';
import {formatNumber} from '@tryghost/shade';
import {useMemo} from 'react';

// Type for direction values
export type DiffDirection = 'up' | 'down' | 'same';

// Helper function to convert range to date parameters
export const getRangeDates = (rangeInDays: number) => {
    const endDate = moment().format('YYYY-MM-DD');
    let startDate;
    
    if (rangeInDays === 1) {
        // Today
        startDate = endDate;
    } else if (rangeInDays === 1000) {
        // All time - use a far past date
        startDate = '2010-01-01';
    } else {
        // Specific range
        startDate = moment().subtract(rangeInDays - 1, 'days').format('YYYY-MM-DD');
    }
    
    return {startDate, endDate};
};

// Calculate totals from member data
const calculateTotals = (memberData: MemberStatusItem[]) => {
    if (!memberData.length) {
        return {
            totalMembers: 0,
            freeMembers: 0,
            paidMembers: 0,
            percentChanges: {
                total: '0%',
                free: '0%',
                paid: '0%'
            },
            directions: {
                total: 'same' as DiffDirection,
                free: 'same' as DiffDirection,
                paid: 'same' as DiffDirection
            }
        };
    }
    
    // Get latest values
    const latest = memberData[memberData.length - 1];
    
    // Calculate total members
    const totalMembers = latest.free + latest.paid + latest.comped;
    
    // Calculate percentage changes if we have enough data
    const percentChanges = {
        total: '0%',
        free: '0%',
        paid: '0%'
    };
    
    const directions = {
        total: 'same' as DiffDirection,
        free: 'same' as DiffDirection,
        paid: 'same' as DiffDirection
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
    
    return {
        totalMembers,
        freeMembers: latest.free,
        paidMembers: latest.paid,
        percentChanges,
        directions
    };
};

// Format chart data 
const formatChartData = (memberData: MemberStatusItem[]) => {
    return memberData.map(item => ({
        date: item.date,
        value: item.free + item.paid + item.comped,
        free: item.free,
        paid: item.paid,
        comped: item.comped,
        formattedValue: formatNumber(item.free + item.paid + item.comped),
        label: 'Total members'
    }));
};

export const useGrowthStats = (range: number) => {
    // Calculate date range
    const {startDate, endDate} = useMemo(() => getRangeDates(range), [range]);
    
    // Fetch member count history from API
    const {data: memberCountResponse, isLoading} = useMemberCountHistory({
        searchParams: {
            date_from: startDate,
            date_to: endDate
        }
    });
    
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
    
    // Calculate totals
    const totalsData = useMemo(() => calculateTotals(memberData), [memberData]);
    
    // Format chart data
    const chartData = useMemo(() => formatChartData(memberData), [memberData]);
    
    return {
        isLoading,
        memberData,
        startDate,
        endDate,
        totals: totalsData,
        chartData
    };
}; 