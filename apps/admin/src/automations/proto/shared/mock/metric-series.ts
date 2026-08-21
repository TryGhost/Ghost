import type {AutomationRunMetrics, EnrollmentPoint, MetricKey} from './types';

// Per-metric daily series for the run-analytics charts.
//
// Only `enrollments_by_day` is authored. The three funnel-state metrics
// (in_progress / completed / exited_early) have no authored series yet, so we
// derive one by scaling the enrollments series by that metric's share of total
// enrollments — deterministic, and each derived series sums to roughly the
// metric's own total. This is a placeholder: when a real per-metric analytics
// API lands, this is the single function to swap, and every concept keeps
// charting through it unchanged.
export function metricSeries(metrics: AutomationRunMetrics, key: MetricKey): EnrollmentPoint[] {
    if (key === 'enrollments') {
        return metrics.enrollments_by_day;
    }
    const share = metrics.enrollments > 0 ? metrics[key] / metrics.enrollments : 0;
    return metrics.enrollments_by_day.map(point => ({
        date: point.date,
        count: Math.round(point.count * share)
    }));
}
