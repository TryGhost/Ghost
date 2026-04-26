// Normalizes the outcome of a permission handler so V1 and V2 results can be
// compared structurally without spurious divergences from semantically-
// equivalent shapes.
//
// A handler resolves with:
//   - undefined / null / {} / {excludedAttrs: undefined|null|[]}  (allow, no exclusions)
//   - {excludedAttrs: ['tags', ...]}                              (allow, with exclusions)
// or rejects with an error (deny).
//
// We classify each side as 'allow' | 'deny' and, when allow, capture a
// canonical sorted-deduped excludedAttrs array. (Attr names are case-sensitive
// — they map to model attributes — so we do NOT lowercase.)

function normalizeAllow(value) {
    const excludedAttrs = value && Array.isArray(value.excludedAttrs)
        ? [...new Set(value.excludedAttrs)].sort()
        : [];
    return {result: 'allow', excludedAttrs};
}

function normalizeDeny(error) {
    return {
        result: 'deny',
        // errorType helps debug divergences but is intentionally NOT used by
        // resultsMatch — V1 may throw HostingLimitError where V2 throws
        // NoPermissionError; both are "deny" semantically.
        errorType: (error && error.constructor && error.constructor.name) || 'Error'
    };
}

function resultsMatch(a, b) {
    if (a.result !== b.result) {
        return false;
    }
    if (a.result === 'deny') {
        return true;
    }
    // both allow: compare excludedAttrs
    if (a.excludedAttrs.length !== b.excludedAttrs.length) {
        return false;
    }
    for (let i = 0; i < a.excludedAttrs.length; i++) {
        if (a.excludedAttrs[i] !== b.excludedAttrs[i]) {
            return false;
        }
    }
    return true;
}

module.exports = {normalizeAllow, normalizeDeny, resultsMatch};
