import type { AttributeValue } from './tracer';

/**
 * Must stay a subset of OpenTelemetry's `Counter`, so that an OpenTelemetry counter can be passed
 * in its place.
 */
export interface Counter {
  /** Adds `value`, a positive number, to the count of what `attributes` describe. */
  add(value: number, attributes?: Record<string, AttributeValue>): void;
}

/**
 * Follows OpenTelemetry's metrics API, as `Tracer` follows its tracing API, so that OpenTelemetry
 * can replace it without changing what is counted. A counter counts something that happens
 * outside any operation a span records, such as reading a field Ghost can't make sense of.
 *
 * It differs from OpenTelemetry in one way: each addition ships as a document of its own, where
 * OpenTelemetry sums additions in memory and exports the totals every few seconds. Shipping each
 * addition is enough for counting rare occurrences. Summing in memory waits until Ghost decides
 * how it measures reads as well as writes. The meter also lacks OpenTelemetry's other
 * instruments, such as histograms and gauges, and a counter's unit and description.
 */
export interface Meter {
  /**
   * Dashboards and alerts find a counter by `name`, so it names what is counted in the domain's
   * terms, as a span names its operation.
   */
  createCounter(name: string): Counter;
}
