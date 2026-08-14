export type KpiMetric = {
    dataKey: string;
    label: string;
    color: string;
    formatter: (value: number) => string;
};
