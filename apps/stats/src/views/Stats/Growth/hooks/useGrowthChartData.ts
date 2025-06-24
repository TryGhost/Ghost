import {GhAreaChartDataItem, centsToDollars, formatDisplayDateWithRange, formatNumber} from '@tryghost/shade';
import {sanitizeChartData} from '@src/utils/chart-helpers';
import {useMemo} from 'react';

type ChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    mrr: number;
    paid_subscribed?: number;
    paid_canceled?: number;
    formattedValue: string;
    label?: string;
};

export const useGrowthChartData = (
    currentTab: string,
    allChartData: ChartDataItem[],
    range: number,
    currencySymbol: string
) => {
    const chartData = useMemo(() => {
        if (!allChartData || allChartData.length === 0) {
            return [];
        }

        // First sanitize the data based on the selected field
        let sanitizedData: ChartDataItem[] = [];
        let fieldName: keyof ChartDataItem = 'value';

        switch (currentTab) {
        case 'free-members':
            fieldName = 'free';
            break;
        case 'paid-members':
            fieldName = 'paid';
            break;
        case 'mrr': {
            fieldName = 'mrr';
            break;
        }
        default:
            fieldName = 'value';
        }

        sanitizedData = sanitizeChartData(allChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        let processedData: GhAreaChartDataItem[] = [];

        switch (currentTab) {
        case 'free-members':
            processedData = sanitizedData.map((item, index) => {
                const diffValue = index === 0 ? null : item.free - sanitizedData[index - 1].free;
                return {
                    ...item,
                    value: item.free,
                    formattedValue: formatNumber(item.free),
                    label: 'Free members',
                    diffValue,
                    formattedDiffValue: diffValue === null ? null : (diffValue < 0 ? `-${formatNumber(diffValue)}` : `+${formatNumber(diffValue)}`)
                };
            });
            break;
        case 'paid-members':
            processedData = sanitizedData.map((item, index) => {
                const diffValue = index === 0 ? null : item.paid - sanitizedData[index - 1].paid;
                return {
                    ...item,
                    value: item.paid,
                    formattedValue: formatNumber(item.paid),
                    label: 'Paid members',
                    diffValue,
                    formattedDiffValue: diffValue === null ? null : (diffValue < 0 ? `-${formatNumber(diffValue)}` : `+${formatNumber(diffValue)}`)
                };
            });
            break;
        case 'mrr':
            processedData = sanitizedData.map((item, index) => {
                const diffValue = index === 0 ? null : centsToDollars(item.mrr) - centsToDollars(sanitizedData[index - 1].mrr);
                return {
                    ...item,
                    value: centsToDollars(item.mrr),
                    formattedValue: `${currencySymbol}${formatNumber(centsToDollars(item.mrr))}`,
                    label: 'MRR',
                    diffValue,
                    formattedDiffValue: diffValue === null ? null : (diffValue < 0 ? `-${currencySymbol}${formatNumber(diffValue * -1)}` : `+${currencySymbol}${formatNumber(diffValue)}`)
                };
            });
            break;
        default:
            processedData = sanitizedData.map((item, index) => {
                const currentTotal = item.free + item.paid + item.comped;
                const previousTotal = index === 0 ? null : sanitizedData[index - 1].free + sanitizedData[index - 1].paid + sanitizedData[index - 1].comped;
                const diffValue = index === 0 ? null : currentTotal - previousTotal!;
                return {
                    ...item,
                    value: currentTotal,
                    formattedValue: formatNumber(currentTotal),
                    label: 'Total members',
                    diffValue,
                    formattedDiffValue: diffValue === null ? null : (diffValue < 0 ? `-${formatNumber(diffValue)}` : `+${formatNumber(diffValue)}`)
                };
            });
        }

        return processedData;
    }, [currentTab, allChartData, range, currencySymbol]);

    const paidChangeChartData = useMemo(() => {
        if (currentTab !== 'paid-members') {
            return [];
        }

        if (!allChartData || allChartData.length === 0) {
            return [];
        }

        // First sanitize the data for the current range
        const sanitizedData = sanitizeChartData(allChartData, range, 'paid', 'exact');

        // Transform the sanitized data into the format expected by the chart
        return sanitizedData.map((item) => {
            // Format date in a more readable format (e.g., "25 May")
            const date = new Date(item.date);

            return {
                date: formatDisplayDateWithRange(date, range),
                new: item.paid_subscribed || 0,
                cancelled: -(item.paid_canceled || 0) // Negative for the stacked bar chart
            };
        });
    }, [currentTab, allChartData, range]);

    return {chartData, paidChangeChartData};
};