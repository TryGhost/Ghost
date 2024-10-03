const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const request = require('supertest');
const parsePrometheusTextFormat = require('parse-prometheus-text-format');
const configUtils = require('../../utils/configUtils');

describe('Metrics Server', function () {
    before(function () {
        configUtils.set('metrics_server:enabled', true);
    });

    it('should start up when Ghost boots and stop when Ghost stops', async function () {
        // Ensure the metrics server is running after Ghost boots
        await testUtils.startGhost({forceStart: true});
        await request('http://127.0.0.1:9417').get('/metrics').expect(200);

        // Stop Ghost and ensure the metrics server is no longer running
        await testUtils.stopGhost();
            
        // Requesting the metrics endpoint should throw an error
        let error;
        try {
            await request('http://127.0.0.1:9417').get('/metrics');
        } catch (err) {
            error = err;
        }
        assert.ok(error);
    });

    it('should not start if enabled is false', async function () {
        configUtils.set('metrics_server:enabled', false);
        await testUtils.startGhost({forceStart: true});
        // Requesting the metrics endpoint should throw an error
        let error;
        try {
            await request('http://127.0.0.1:9417').get('/metrics');
        } catch (err) {
            error = err;
        }
        assert.ok(error);
        await testUtils.stopGhost();
    });

    describe('metrics and format', function () {
        let metricsResponse;
        let metricsText;
        before(async function () {
            configUtils.set('metrics_server:enabled', true);
            await testUtils.startGhost({forceStart: true});
            metricsResponse = await request('http://127.0.0.1:9417').get('/metrics');
            metricsText = metricsResponse.text;
            await testUtils.stopGhost();
        });
        it('should export the metrics in the right format', async function () {
            const metricsJson = parsePrometheusTextFormat(metricsText);
            assert.ok(metricsJson);
        });

        it('should use the right prefix for all metrics', async function () {
            const metricsJson = parsePrometheusTextFormat(metricsText);
            const metricNames = metricsJson.map(metric => metric.name);
            metricNames.forEach((metricName) => {
                assert.match(metricName, /^ghost_/);
            });
        });

        it('should have help text for all metrics', async function () {
            const metricsJson = parsePrometheusTextFormat(metricsText);
            metricsJson.forEach((metric) => {
                assert.ok(metric.help);
            });
        });

        it('should have type for all metrics', async function () {
            const metricsJson = parsePrometheusTextFormat(metricsText);
            metricsJson.forEach((metric) => {
                assert.ok(metric.type);
            });
        });

        it('should have all the right metrics', async function () {
            // Ensures we have all the metrics we expect exported
            // This could be a snapshot test in the future, but for now just check the names of the metrics
            // Add new metrics to this list as they are added
            const expectedMetrics = [
                'ghost_process_cpu_user_seconds_total',
                'ghost_process_cpu_system_seconds_total',
                'ghost_process_cpu_seconds_total',
                'ghost_process_start_time_seconds',
                'ghost_process_resident_memory_bytes',
                'ghost_nodejs_eventloop_lag_seconds',
                'ghost_nodejs_eventloop_lag_min_seconds',
                'ghost_nodejs_eventloop_lag_max_seconds',
                'ghost_nodejs_eventloop_lag_mean_seconds',
                'ghost_nodejs_eventloop_lag_stddev_seconds',
                'ghost_nodejs_eventloop_lag_p50_seconds',
                'ghost_nodejs_eventloop_lag_p90_seconds',
                'ghost_nodejs_eventloop_lag_p99_seconds',
                'ghost_nodejs_active_resources',
                'ghost_nodejs_active_resources_total',
                'ghost_nodejs_active_handles',
                'ghost_nodejs_active_handles_total',
                'ghost_nodejs_active_requests',
                'ghost_nodejs_active_requests_total',
                'ghost_nodejs_heap_size_total_bytes',
                'ghost_nodejs_heap_size_used_bytes',
                'ghost_nodejs_external_memory_bytes',
                'ghost_nodejs_heap_space_size_total_bytes',
                'ghost_nodejs_heap_space_size_used_bytes',
                'ghost_nodejs_heap_space_size_available_bytes',
                'ghost_nodejs_version_info',
                'ghost_nodejs_gc_duration_seconds'
            ];
            const metricsJson = parsePrometheusTextFormat(metricsText);
            const metricNames = metricsJson.map(metric => metric.name);
            for (const metricName of expectedMetrics) {
                assert.ok(metricNames.includes(metricName));
            }
        });
    });
});