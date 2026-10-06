// Perf experiment: run one memory-reducing major GC once HTTP traffic has been quiet for a few
// seconds, because V8 13+ memory reducer otherwise waits ~100s to release heap.
const http = require('node:http');
const v8 = require('node:v8');
const vm = require('node:vm');
const {performance} = require('node:perf_hooks');

const QUIET_MS = 5000;
const MIN_INTERVAL_MS = 30000;

v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc');

let inFlight = 0;
let lastActivity = Date.now();
let lastGc = 0;
let dirty = false;

const emit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, req, res) {
    if (event === 'request') {
        inFlight += 1;
        dirty = true;
        res.once('close', () => {
            inFlight -= 1;
            lastActivity = Date.now();
        });
    }
    return emit.apply(this, arguments);
};

setInterval(() => {
    const now = Date.now();
    if (!dirty || inFlight > 0 || now - lastActivity < QUIET_MS || now - lastGc < MIN_INTERVAL_MS) {
        return;
    }
    dirty = false;
    lastGc = now;
    const start = performance.now();
    gc({type: 'major', flavor: 'last-resort'});
    // eslint-disable-next-line no-console
    console.log(`idle-gc: major GC in ${(performance.now() - start).toFixed(1)}ms`);
}, 1000).unref();
