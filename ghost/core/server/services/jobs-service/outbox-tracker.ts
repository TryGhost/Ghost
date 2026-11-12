import type { JobSettlement } from '@tryghost/adapter-base-jobs';
import type { JobsLogger } from './jobs-service';

export interface OutboxRowRemover {
  remove(id: string): Promise<void>;
}

// Ends an outbox row's life once its job has settled, completed or dead. The
// row stays until then so a job lost after hand-off can be handed over again.
export class OutboxTracker {
  readonly #store: OutboxRowRemover;
  readonly #logging: JobsLogger;

  constructor({ store, logging }: { store: OutboxRowRemover; logging: JobsLogger }) {
    this.#store = store;
    this.#logging = logging;
  }

  // A failure leaves the row to be handed over again; it never changes the
  // job's own outcome
  onSettled = async (id: string, _settlement: JobSettlement): Promise<void> => {
    try {
      await this.#store.remove(id);
    } catch (err) {
      this.#logging.error(err, `[Jobs Outbox] job ${id} settled but its row remains`);
    }
  };
}
