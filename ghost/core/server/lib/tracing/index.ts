import logging from '@tryghost/logging';
import ghostMetrics from '@tryghost/metrics';
import { createMeter } from './create-meter';
import { createTracer } from './create-tracer';

/**
 * The one tracer every Ghost service records its spans with, so that every span ships the same
 * way. Spans ship through `@tryghost/metrics`, which Ghost(Pro) configures to send them to
 * Elasticsearch. Self-hosted sites leave `@tryghost/metrics` without a transport, so their spans
 * are never sent anywhere.
 */
export const tracer = createTracer({ transport: ghostMetrics, logging });

/** The meter Ghost's services count with, shipped the same way as the tracer's spans. */
export const meter = createMeter({ transport: ghostMetrics, logging });
