import { Script } from 'node:vm';

// V8 13+ blocks the memory reducer's normal low-allocation path when sampled cppgc
// throughput is exactly zero, which Ghost's workload leaves it at. vm.Script is
// cppgc-backed; allocating one periodically keeps that throughput non-zero.
// Remove once fixed upstream: https://issues.chromium.org/issues/570738027
const INTERVAL_MS = 30_000;
const FIRST_AFFECTED_V8_MAJOR = 13;

let timer: ReturnType<typeof setInterval> | undefined;

const allocateCppgcObject = () => new Script('0');

export function startMemoryReducerKeepalive(): void {
  if (timer || Number(process.versions.v8.split('.')[0]) < FIRST_AFFECTED_V8_MAJOR) {
    return;
  }

  allocateCppgcObject();
  timer = setInterval(allocateCppgcObject, INTERVAL_MS).unref();
}

export function stopMemoryReducerKeepalive(): void {
  clearInterval(timer);
  timer = undefined;
}
