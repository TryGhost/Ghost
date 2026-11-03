import type { GhostLogger } from '@tryghost/logging';
import type { GhostMetrics } from '@tryghost/metrics';
import { noLabels, setLabel, type Labels } from './labels';
import type { Meter } from './meter';

/** What each addition to a counter ships as, named and labelled as a span's document is. */
export interface CountDocument extends Labels {
  '@timestamp': number;
  event: { name: string };
  value: number;
}

/**
 * Every counter ships to the one data stream, `metrics-ghost-counters`, whatever its name, as every
 * span ships to `metrics-ghost-spans`, so dashboards tell counters apart by `event.name`.
 */
const METRIC = 'ghost-counters';

/** Ships each addition to a counter as a `@tryghost/metrics` document, named as a span is. */
export function createMeter({
  transport,
  logging,
}: {
  transport: Pick<GhostMetrics, 'metric'>;
  logging: Pick<GhostLogger, 'error'>;
}): Meter {
  return {
    createCounter(name) {
      return {
        add(value, attributes = {}) {
          const failed = (err: unknown) =>
            logging.error(
              { event: { name: 'metrics.record.failed' }, err, counter: { name } },
              'Recording a count failed',
            );
          try {
            const labels = noLabels();
            for (const [key, attribute] of Object.entries(attributes)) {
              setLabel(labels, key, attribute);
            }
            const document: CountDocument = {
              '@timestamp': Date.now(),
              event: { name },
              value,
              ...labels,
            };
            // Deferred and never awaited, as a span is, so shipping a count never holds up the
            // code that counted.
            Promise.resolve()
              .then(() => transport.metric(METRIC, document))
              .catch(failed);
          } catch (err) {
            failed(err);
          }
        },
      };
    },
  };
}
