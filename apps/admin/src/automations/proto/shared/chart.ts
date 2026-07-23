import type {EnrollmentPoint} from './mock';
import type {GhAreaChartDataItem} from '@tryghost/shade/patterns';
import {formatNumber} from '@tryghost/shade/utils';

// Presentational chart helpers shared by every automations proto concept, so
// they all turn a daily series into a GhAreaChart the same way. Kept out of
// ./mock (which stays pure, API-shaped data) because these pull in Shade's chart
// type + number formatting.

interface AreaDataOptions {
    /** Keep only the last N points (e.g. the selected timeframe). Omit for all. */
    range?: number;
    /** Series label shown in the chart tooltip. */
    label: string;
}

/** Map a daily series to the shape GhAreaChart expects, sliced to `range`. */
export function toAreaData(points: EnrollmentPoint[], {range, label}: AreaDataOptions): GhAreaChartDataItem[] {
    const sliced = range ? points.slice(-range) : points;
    return sliced.map(point => ({
        date: point.date,
        value: point.count,
        formattedValue: formatNumber(point.count),
        label
    }));
}

export type TrendDirection = 'up' | 'down' | 'same';

// First-vs-last percentage change across a series, for the KPI tile trend badge.
// Mirrors the analytics newsletters KPI diff.
export function seriesDiff(points: EnrollmentPoint[]): {direction: TrendDirection; value: string} {
    if (points.length <= 1) {
        return {direction: 'same', value: '0%'};
    }
    const prev = points[0]?.count ?? 0;
    const curr = points[points.length - 1]?.count ?? 0;

    let direction: TrendDirection = 'same';
    if (curr > prev) {
        direction = 'up';
    } else if (curr < prev) {
        direction = 'down';
    }

    if (prev === 0) {
        return {direction, value: curr === 0 ? '0%' : '+100%'};
    }
    const diff = ((curr - prev) / prev) * 100;
    const rounded = Math.round(diff * 10) / 10;
    return {direction, value: `${diff >= 0 ? '+' : ''}${rounded}%`};
}
