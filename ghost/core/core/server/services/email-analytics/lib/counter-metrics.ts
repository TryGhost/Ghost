import logging from '@tryghost/logging';
import type { PrometheusClient } from '@tryghost/prometheus-metrics';

export type CounterMetricsClient = Pick<PrometheusClient, 'registerCounter' | 'getMetric'>;

/**
 * Increment a registered counter without letting a metrics failure interrupt
 * the counter work that produced the observation.
 */
export function incrementCounter(
  client: CounterMetricsClient | null | undefined,
  name: string,
  labels: Record<string, string>,
  value: number,
): void {
  try {
    const metric = client?.getMetric(name);
    if (metric && 'inc' in metric) {
      metric.inc(labels, value);
    }
  } catch (error) {
    logging.error(`[EmailAnalytics] Error recording ${name}`, error);
  }
}
