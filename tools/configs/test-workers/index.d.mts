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

export function testWorkerCount(options: TestWorkerOptions): number;
