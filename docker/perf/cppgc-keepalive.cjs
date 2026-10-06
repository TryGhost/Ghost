// Perf experiment: V8 13+ treats a zero cppgc allocation rate as "high alloc", so its
// memory reducer never runs; a tiny periodic vm.Script (cppgc-backed) keeps the rate non-zero.
const vm = require('node:vm');

setInterval(() => new vm.Script('0'), 30_000).unref();
