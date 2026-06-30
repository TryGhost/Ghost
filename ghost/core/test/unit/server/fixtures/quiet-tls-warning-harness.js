// Forked harness used by quiet-tls-warning.test.js. Loads the module under test
// (which patches process.emitWarning), then synthesises both the real TLS
// warning Node emits internally and any extra warning requested by env so the
// test can assert non-TLS warnings still surface.

require('../../../../core/server/quiet-tls-warning');

// Synthesise the exact TLS warning Node emits internally on first HTTPS use.
// We avoid making a real network request from the test suite by emitting the
// same warning text through process.emitWarning — which is the API Node's
// internals use to raise it (see lib/_tls_wrap.js).
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    process.emitWarning(
        "Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification."
    );
}

if (process.env.EXTRA_WARNING_NAME && process.env.EXTRA_WARNING_MESSAGE) {
    process.emitWarning(process.env.EXTRA_WARNING_MESSAGE, process.env.EXTRA_WARNING_NAME);
}

// Give Node a moment to flush any internal warning emission.
setTimeout(() => {
    process.exit(0);
}, 50);
