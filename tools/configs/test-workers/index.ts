import { availableParallelism, totalmem } from 'node:os';

export interface TestWorkerOptions {
  /** Memory one worker uses at its peak, including the browser or Ghost it drives. */
  memoryPerWorkerGB: number;
  /** Cores one worker keeps busy. Default `1`. */
  cpusPerWorker?: number;
  /** Default `1`. */
  min?: number;
  /** Default no limit. */
  max?: number;
}

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
  const raw = process.env.GHOST_TEST_MACHINE_SHARE;
  const share = Number(raw || 1);
  if (!(share > 0 && share <= 1)) {
    throw new Error(`GHOST_TEST_MACHINE_SHARE must be greater than 0 and at most 1, got "${raw}"`);
  }
  return share;
}

// totalmem() reports the host's memory inside a memory-limited container
function usableMemory() {
  const limit = process.constrainedMemory?.() ?? 0;
  const total = totalmem();
  return (limit > 0 && limit < total ? limit : total) * USABLE_MEMORY_SHARE;
}

/**
 * Number of parallel workers for a test suite whose workers each run a browser
 * or a Ghost. Such workers can exhaust memory before they saturate the cores,
 * so take whichever limit is lower. `TEST_WORKERS_COUNT` sets an exact count
 * instead.
 */
export function testWorkerCount({
  memoryPerWorkerGB,
  cpusPerWorker = 1,
  min = 1,
  max = Infinity,
}: TestWorkerOptions): number {
  // A fractional count makes Vitest start a fork with no pool id
  const override = Math.floor(Number(process.env.TEST_WORKERS_COUNT));
  if (override >= 1) {
    return override;
  }

  const share = machineShare();
  // The runner's main process needs a core of its own
  const byCpu = Math.floor((availableParallelism() * share - 1) / cpusPerWorker);
  const byMemory = Math.floor((usableMemory() * share) / (memoryPerWorkerGB * GB));

  return Math.max(min, Math.min(max, byCpu, byMemory));
}
