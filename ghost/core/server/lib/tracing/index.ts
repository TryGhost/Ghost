import logging from '@tryghost/logging';
import ghostMetrics from '@tryghost/metrics';
import { createTracer } from './create-tracer';

/**
 * The tracer Ghost's services record their spans with, so every span ships the same way. It
 * ships through the metrics transport, which Ghost(Pro) points at Elasticsearch and self-hosted
 * sites leave unconfigured, so nothing leaves them.
 */
export const tracer = createTracer({ transport: ghostMetrics, logging });
