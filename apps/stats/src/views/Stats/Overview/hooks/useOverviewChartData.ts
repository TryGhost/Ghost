import {GhAreaChartDataItem, centsToDollars, formatNumber, sanitizeChartData} from '@tryghost/shade';
import {useMemo} from 'react';

interface WebKpiDataItem {
    date: string;
    [key: string]: string | number;
}

type GrowthChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    mrr: number;
    formattedValue: string;
    label?: string;
};

export const useOverviewChartData = (
    visitorsData: WebKpiDataItem[] | undefined,
    growthChartData: GrowthChartDataItem[] | undefined,
    range: number,
    currencySymbol: string,
    paidMembersEnabled?: boolean
) => {
    const visitorsChartData = useMemo(() => {
        return sanitizeChartData<WebKpiDataItem>(visitorsData as WebKpiDataItem[] || [], range, 'visits' as keyof WebKpiDataItem, 'sum')?.map((item: WebKpiDataItem) => {
            const value = Number(item.visits);
            const safeValue = isNaN(value) ? 0 : value;
            return {
                date: String(item.date),
                value: safeValue,
                formattedValue: formatNumber(safeValue),
                label: 'Visitors'
            };
        });
    }, [visitorsData, range]);

    const visitorsYRange: [number, number] = [0, Math.max(...(visitorsChartData?.map((item: GhAreaChartDataItem) => item.value) || [0]))];

    const membersChartData = useMemo(() => {
        if (!growthChartData || growthChartData.length === 0) {
            return [];
        }

        let sanitizedData: GrowthChartDataItem[] = [];
        const fieldName: keyof GrowthChartDataItem = 'value';

        sanitizedData = sanitizeChartData<GrowthChartDataItem>(growthChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        const processedData: GhAreaChartDataItem[] = sanitizedData.map(item => ({
            date: item.date,
            value: item.free + item.paid + item.comped,
            formattedValue: formatNumber(item.free + item.paid + item.comped),
            label: 'Members'
        }));

        return processedData;
    }, [growthChartData, range]);

    const mrrChartData = useMemo(() => {
        if (!paidMembersEnabled || !growthChartData || growthChartData.length === 0) {
            return [];
        }

        let sanitizedData: GrowthChartDataItem[] = [];
        const fieldName: keyof GrowthChartDataItem = 'mrr';

        sanitizedData = sanitizeChartData<GrowthChartDataItem>(growthChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        const processedData: GhAreaChartDataItem[] = sanitizedData.map(item => ({
            date: item.date,
            value: centsToDollars(item.mrr),
            formattedValue: `${currencySymbol}${formatNumber(centsToDollars(item.mrr))}`,
            label: 'MRR'
        }));

        return processedData;
    }, [growthChartData, range, currencySymbol, paidMembersEnabled]);

    const kpiValues = useMemo(() => {
        // Visitors data
        if (!visitorsData?.length) {
            return {visits: '0'};
        }

        const totalVisits = visitorsData.reduce((sum, item) => {
            const visits = Number(item.visits);
            return sum + (isNaN(visits) ? 0 : visits);
        }, 0);

        return {
            visits: formatNumber(totalVisits)
        };
    }, [visitorsData]);

    return {
        visitorsChartData,
        visitorsYRange,
        membersChartData,
        mrrChartData,
        kpiValues
    };
};