import { availableParallelism, totalmem } from 'node:os';

const GB = 1024 ** 3;

// The rest of the machine needs memory too, and a machine that swaps runs
// tests slower than one running fewer workers.
const USABLE_MEMORY_SHARE = 0.67;

/**
 * Number of parallel workers for a test suite whose workers each run a browser
 * or a Ghost. Such workers can exhaust memory before they saturate the cores,
 * so take whichever limit is lower. Neither limit can see other test runs on
 * the same machine, so `TEST_WORKERS_COUNT` overrides both.
 *
 * @param {import('./index.d.mts').TestWorkerOptions} options
 */
export function testWorkerCount({ memoryPerWorkerGB, cpusPerWorker = 1, min = 1, max = Infinity }) {
  const override = Number(process.env.TEST_WORKERS_COUNT);
  if (override > 0) {
    return override;
  }

  // The runner's main process needs a core of its own
  const byCpu = Math.floor((availableParallelism() - 1) / cpusPerWorker);
  const byMemory = Math.floor((totalmem() * USABLE_MEMORY_SHARE) / (memoryPerWorkerGB * GB));

  return Math.max(min, Math.min(max, byCpu, byMemory));
}
