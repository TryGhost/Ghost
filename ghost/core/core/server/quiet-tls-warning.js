// Replaces Node's two-line `NODE_TLS_REJECT_UNAUTHORIZED` warning + trace-warnings
// follow-up with a single INFO line at boot.
//
// Ghost's dev container sets NODE_TLS_REJECT_UNAUTHORIZED=0 so self-signed local
// certificates don't fail TLS verification. Node responds with a process-level
// warning that prints twice on the first TLS request of each boot. The state is
// expected in dev — we surface it with a single concise line and silence the
// noisy default. Only this specific warning is filtered; any other warning
// raised via process.emitWarning still surfaces.
//
// Must be required from index.js BEFORE any module that uses TLS — we wrap
// process.emitWarning so the default emitter never gets called for the TLS
// warning. (A plain 'warning' event listener does NOT suppress Node's default
// stderr print.)

const TLS_WARNING_NEEDLE = "NODE_TLS_REJECT_UNAUTHORIZED";

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    const originalEmitWarning = process.emitWarning.bind(process);
    process.emitWarning = function (warning, ...rest) {
        const message = typeof warning === 'string'
            ? warning
            : (warning && warning.message) || '';
        if (message.includes(TLS_WARNING_NEEDLE)) {
            return undefined;
        }
        return originalEmitWarning(warning, ...rest);
    };

    // Use stderr directly — @tryghost/logging may not be loaded yet at this
    // point in boot, and a single deterministic line is what we want anyway.
    process.stderr.write('[dev] TLS verification disabled for localhost development\n');
}

module.exports = {TLS_WARNING_NEEDLE};
