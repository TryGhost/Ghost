import { availableParallelism, totalmem } from 'node:os';

const GB = 1024 ** 3;

// The rest of the machine needs memory too, and a machine that swaps runs
// tests slower than one running fewer workers.
const USABLE_MEMORY_SHARE = 0.67;

/**
 * Share of the machine one test run may use. Each run sizes itself as if it
 * had the machine to itself, so runs in several worktrees at once need to
 * split it between them.
 */
function machineShare() {
  const raw = process.env.TEST_MACHINE_SHARE;
  const share = Number(raw || 1);
  if (!(share > 0 && share <= 1)) {
    throw new Error(`TEST_MACHINE_SHARE must be greater than 0 and at most 1, got "${raw}"`);
  }
  return share;
}

/**
 * Number of parallel workers for a test suite whose workers each run a browser
 * or a Ghost. Such workers can exhaust memory before they saturate the cores,
 * so take whichever limit is lower. `TEST_WORKERS_COUNT` sets an exact count
 * instead.
 *
 * @param {import('./index.d.mts').TestWorkerOptions} options
 */
export function testWorkerCount({ memoryPerWorkerGB, cpusPerWorker = 1, min = 1, max = Infinity }) {
  const override = Number(process.env.TEST_WORKERS_COUNT);
  if (override > 0) {
    return override;
  }

  const share = machineShare();
  // The runner's main process needs a core of its own
  const byCpu = Math.floor((availableParallelism() * share - 1) / cpusPerWorker);
  const byMemory = Math.floor(
    (totalmem() * USABLE_MEMORY_SHARE * share) / (memoryPerWorkerGB * GB),
  );

  return Math.max(min, Math.min(max, byCpu, byMemory));
}
