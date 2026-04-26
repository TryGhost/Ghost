// CUTOVER: delete this file when the soak ends.
//
// Wires canThisV2 as a side-effect of every canThis() handler. V1 always
// determines the actual outcome — V2 runs after V1's promise settles, its
// result is compared, divergences are logged + counted via Prometheus, and
// any error inside V2 is swallowed so it cannot affect the caller.
//
// During the parallel-soak period V2 piggy-backs on V1's role load (V1 has
// already queried the DB; we read the role name off V1's loadedPermissions
// to avoid a second round-trip). After cutover, V1 is deleted and V2 takes
// over its own light role lookup.
//
// Recursion guard: when a model's `permissible()` recursively calls canThis
// (e.g. User.permissible -> canThis(context).assign.role), we must NOT
// re-enter the parallel checker on the inner call — otherwise V2 work
// doubles per nesting level. AsyncLocalStorage is the cleanest signal here
// because it doesn't mutate the context object and doesn't require every
// callee to opt in.
//
// Kill switch: env var `GHOST_PERMISSIONS_V2_PARALLEL=false` short-circuits.
// Read per-call so an env-update + SIGHUP-style reload takes effect without
// requiring a code redeploy. Accepts case-insensitive and common no/off
// spellings. (Labs flags can't be used here — they themselves route through
// the permissions/settings layer.)

const {AsyncLocalStorage} = require('node:async_hooks');
const _ = require('lodash');
const logging = require('@tryghost/logging');
const dispatchPermissible = require('./dispatch-permissible');
const {synthesizeLoadedPermissions} = require('./role-permissions');
const {normalizeAllow, normalizeDeny, resultsMatch} = require('./normalize-allow-result');

const insideV2 = new AsyncLocalStorage();

let metrics = null;
function setMetrics(registered) {
    metrics = registered;
}

const LOG_SAMPLE_WINDOW_MS = 60_000;
const lastLoggedAt = new Map();

const KILL_SWITCH_VALUES = new Set(['false', '0', 'off', 'no']);
function isParallelEnabled() {
    // Re-entrant call from inside V2 itself (model.permissible recursing into
    // canThis). Skip: V2's effect on this nested check would double the work.
    if (insideV2.getStore() === true) {
        return false;
    }
    const flag = process.env.GHOST_PERMISSIONS_V2_PARALLEL;
    if (flag !== undefined) {
        return !KILL_SWITCH_VALUES.has(String(flag).toLowerCase());
    }
    // Default off in test (so existing V1 unit tests aren't affected — V2
    // would double-invoke `permissible()` and break call-count assertions).
    // Tests that want V2 enable it via setMetrics() + the env var or by
    // calling parallelCheck directly.
    if (process.env.NODE_ENV === 'testing') {
        return metrics !== null;
    }
    // In dev/prod: V2 runs regardless of whether Prometheus is enabled. The
    // counters are nullable; logs alone still convey divergence on installs
    // without Prometheus configured.
    return true;
}

function summarizeContext(parsedContext) {
    const userId = parsedContext.user;
    return {
        // Defensive: callers SHOULD pass an id, but if a Bookshelf model ever
        // slips through we don't want to serialize it whole into a log line.
        user_id: (userId && typeof userId === 'object') ? '<object>' : (userId || null),
        api_key_id: parsedContext.api_key ? parsedContext.api_key.id : null,
        api_key_type: parsedContext.api_key ? parsedContext.api_key.type : null,
        internal: Boolean(parsedContext.internal),
        public: Boolean(parsedContext.public)
    };
}

function shouldLog(action, objectType, v1Label, v2Label) {
    const key = `${action}:${objectType}:${v1Label}:${v2Label}`;
    const now = Date.now();
    const last = lastLoggedAt.get(key);
    if (last && now - last < LOG_SAMPLE_WINDOW_MS) {
        return false;
    }
    lastLoggedAt.set(key, now);
    return true;
}

function recordCheck(result) {
    if (metrics && metrics.checks) {
        metrics.checks.inc({result});
    }
}

function recordDivergence(action, objectType, v1Label, v2Label) {
    if (metrics && metrics.divergence) {
        metrics.divergence.inc({
            action,
            object_type: objectType,
            v1: v1Label,
            v2: v2Label
        });
    }
}

function readRoleNameFromLoaded(side) {
    if (!side || !Array.isArray(side.roles) || !side.roles[0]) {
        return null;
    }
    return side.roles[0].name || null;
}

// Run V2 against the same model.permissible() that V1 just ran, but with a
// loadedPermissions object synthesized from the static role map.
function runV2({TargetModel, action, objectType, modelOrId, unsafeAttrs, parsedContext, userRoleName, apiKeyRoleName}) {
    const v2LoadedPermissions = synthesizeLoadedPermissions({userRoleName, apiKeyRoleName});
    return dispatchPermissible({
        TargetModel,
        action,
        objectType,
        modelOrId,
        unsafeAttrs,
        parsedContext,
        loadedPermissions: v2LoadedPermissions
    });
}

// Compares V1 and V2 outcomes for a single handler invocation. Always void —
// V2's outcome never affects the caller; the V1 promise the caller already
// holds is what propagates.
async function compareResults({v1Promise, v2Promise, action, objectType, parsedContext}) {
    let v1Outcome;
    try {
        const v1Value = await v1Promise;
        v1Outcome = normalizeAllow(v1Value);
    } catch (err) {
        v1Outcome = normalizeDeny(err);
    }

    let v2Outcome;
    try {
        const v2Value = await v2Promise;
        v2Outcome = normalizeAllow(v2Value);
    } catch (v2Err) {
        v2Outcome = normalizeDeny(v2Err);
    }

    if (resultsMatch(v1Outcome, v2Outcome)) {
        recordCheck('match');
        return;
    }
    recordCheck('divergence');
    recordDivergence(action, objectType, v1Outcome.result, v2Outcome.result);
    if (shouldLog(action, objectType, v1Outcome.result, v2Outcome.result)) {
        logging.warn({
            event: 'permissions_v2_divergence',
            action,
            object_type: objectType,
            v1: v1Outcome.result,
            v2: v2Outcome.result,
            v1_excluded_attrs: v1Outcome.excludedAttrs,
            v2_excluded_attrs: v2Outcome.excludedAttrs,
            v1_error_type: v1Outcome.errorType,
            v2_error_type: v2Outcome.errorType,
            context: summarizeContext(parsedContext)
        });
    }
}

// Public entrypoint called from can-this.js's handler. V2 is launched as a
// side effect; the caller awaits the V1 promise we return unmodified.
function runParallel(v1Promise, {parsedContext, action, objectType, modelOrId, unsafeAttrs, loadedPermissions, TargetModel}) {
    if (!isParallelEnabled() || parsedContext.internal) {
        return v1Promise;
    }

    let v2Promise;
    try {
        const userRoleName = loadedPermissions && loadedPermissions.user
            ? readRoleNameFromLoaded(loadedPermissions.user) : null;
        const apiKeyRoleName = loadedPermissions && loadedPermissions.apiKey
            ? readRoleNameFromLoaded(loadedPermissions.apiKey) : null;

        // cloneDeep `unsafeAttrs` so any V1 mutation between handler entry
        // and now doesn't leak into V2 — eliminates an entire class of
        // order-dependent false positives. parsedContext is shallow + plain
        // so a shallow copy suffices and avoids cloning Bookshelf models.
        const v2Attrs = _.cloneDeep(unsafeAttrs || {});
        const v2Context = Object.assign({}, parsedContext);

        // Mark this async branch so any nested canThis triggered by
        // model.permissible inside V2 skips its own parallel-check.
        v2Promise = insideV2.run(true, () => runV2({
            TargetModel,
            action,
            objectType,
            modelOrId,
            unsafeAttrs: v2Attrs,
            parsedContext: v2Context,
            userRoleName,
            apiKeyRoleName
        }));
    } catch (err) {
        v2Promise = Promise.reject(err);
    }

    compareResults({
        v1Promise: Promise.resolve(v1Promise),
        v2Promise,
        action,
        objectType,
        parsedContext
    }).catch((err) => {
        recordCheck('error');
        try {
            logging.warn({
                event: 'permissions_v2_compare_failed',
                action,
                object_type: objectType,
                error: err && err.message,
                context: summarizeContext(parsedContext)
            });
        } catch (_e) {
            // Last-resort: do nothing. Never let logging crash a request.
        }
    });

    // V2 has zero influence on the returned outcome.
    return v1Promise;
}

module.exports = {runParallel, setMetrics, isParallelEnabled, summarizeContext, shouldLog, readRoleNameFromLoaded};
