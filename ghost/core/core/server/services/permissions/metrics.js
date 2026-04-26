// CUTOVER: delete this file when the soak ends.
//
// Wires Prometheus counters (when available) and a no-op fallback otherwise,
// then hands them to parallel-check.js. The fallback is the important part:
// V2 must run on every install — including those that haven't enabled
// Prometheus in config — so the parallel-soak signal isn't gated on an
// observability dependency. The Prometheus counters are the cutover gate
// ("zero divergences for 14 days at >1M checks"); logs say *which* requests
// diverged.

const prometheusClient = require('../../../shared/prometheus-client');
const parallelCheck = require('./parallel-check');

function registerMetrics() {
    // Skip in test mode — V1 tests call permissions.init() incidentally and
    // would otherwise enable V2 globally for the rest of the run, breaking
    // call-count assertions on `Model.permissible`. Test files that exercise
    // V2 set metrics directly via `parallelCheck.setMetrics(...)`.
    if (process.env.NODE_ENV === 'testing') {
        return;
    }
    if (!prometheusClient) {
        // Without Prometheus configured V2 still runs (parallel-check.js
        // tolerates `metrics === null`); we just don't emit counters. Logs
        // alone convey divergence on installs without Prometheus.
        return;
    }
    prometheusClient.registerCounter({
        name: 'ghost_permissions_v2_checks_total',
        help: 'Total permission checks compared between V1 (DB) and V2 (static map) during the parallel-run period',
        labelNames: ['result']
    });
    prometheusClient.registerCounter({
        name: 'ghost_permissions_v2_divergence_total',
        help: 'Permission checks where V1 (DB) and V2 (static map) disagreed',
        labelNames: ['action', 'object_type', 'v1', 'v2']
    });
    parallelCheck.setMetrics({
        checks: prometheusClient.getMetric('ghost_permissions_v2_checks_total'),
        divergence: prometheusClient.getMetric('ghost_permissions_v2_divergence_total')
    });
}

module.exports = {registerMetrics};
