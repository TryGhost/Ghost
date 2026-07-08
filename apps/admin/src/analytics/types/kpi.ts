export type KpiMetric = {
    dataKey: string;
    label: string;
    chartColor: string;
    formatter: (value: number) => string;
};
