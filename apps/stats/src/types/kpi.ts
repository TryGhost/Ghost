export type KpiMetric = {
    dataKey: string;
    label: string;
    formatter: (value: number) => string;
};
