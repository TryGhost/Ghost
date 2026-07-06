/* global process */
/**
 * Measures locale-namespace coverage in a built app bundle.
 *
 * Two measurements:
 *  1) NAMESPACE PRESENCE — using keys unique to each namespace (present in that
 *     namespace's en JSON and NO other namespace's), checks whether the bundle
 *     contains that namespace at all. A tree-shaken app shows its own namespace's
 *     unique keys and ~none of the others'.
 *  2) LOCALE COVERAGE for the expected namespace — for a distinctive non-English,
 *     namespace-unique key, counts how many of the 62 locales' translated values
 *     appear in the bundle (proves no per-locale data loss).
 *
 * Usage: node measure-bundle-locales.js <path-to-bundle> [expectedNamespace]
 */
const fs = require('fs');
const path = require('path');

const I18N_ROOT = path.join(__dirname, '..');
const LOCALES = require('../lib/locale-data.json').map(l => l.code);
const NAMESPACES = ['ghost', 'portal', 'signup-form', 'comments', 'search'];

const bundlePath = process.argv[2];
const expected = process.argv[3];
if (!bundlePath) {
    process.stderr.write('usage: measure-bundle-locales.js <bundle> [expectedNamespace]\n');
    process.exit(2);
}
const bundle = fs.readFileSync(bundlePath, 'utf8');

function flatKeys(obj) {
    const out = [];
    (function walk(o) {
        for (const [k, v] of Object.entries(o)) {
            if (typeof v === 'string') {
                out.push(k);
            } else if (v && typeof v === 'object') {
                walk(v);
            }
        }
    })(obj);
    return out;
}

function loadNs(locale, ns) {
    try {
        return require(path.join(I18N_ROOT, 'locales', locale, `${ns}.json`));
    } catch (e) {
        return null;
    }
}

// keys unique to each namespace (based on en)
const keysByNs = {};
for (const ns of NAMESPACES) {
    keysByNs[ns] = new Set(flatKeys(loadNs('en', ns) || {}));
}
const uniqueKeysByNs = {};
for (const ns of NAMESPACES) {
    const others = new Set();
    for (const o of NAMESPACES) {
        if (o !== ns) {
            for (const k of keysByNs[o]) {
                others.add(k);
            }
        }
    }
    uniqueKeysByNs[ns] = [...keysByNs[ns]].filter(k => !others.has(k) && !/[{}<>]/.test(k) && k.length >= 4);
}

function bundleHas(str) {
    if (bundle.includes(str)) {
        return true;
    }
    const esc = JSON.stringify(str).slice(1, -1);
    return esc !== str && bundle.includes(esc);
}

process.stdout.write(`\nBundle: ${path.basename(bundlePath)}  (${(bundle.length / 1024 / 1024).toFixed(2)} MB raw)\n`);

// (1) namespace presence via unique keys
process.stdout.write(`\n[1] Namespace presence (unique-key hits out of up to 30 probed):\n`);
for (const ns of NAMESPACES) {
    const probe = uniqueKeysByNs[ns].slice(0, 30);
    let hits = 0;
    for (const k of probe) {
        if (bundleHas(k)) {
            hits += 1;
        }
    }
    const verdict = expected
        ? (ns === expected ? 'PRESENT (expected)' : (hits === 0 ? 'absent (correct)' : `LEAK (${hits} hits)`))
        : '';
    process.stdout.write(`  ${ns.padEnd(12)} ${hits}/${probe.length}   ${verdict}\n`);
}

// (2) locale coverage for the expected namespace, using a distinctive non-en unique key
if (expected) {
    // choose the unique key whose values differ most across locales
    let best = null;
    let bestDistinct = -1;
    for (const k of uniqueKeysByNs[expected]) {
        const vals = new Set();
        for (const locale of LOCALES) {
            const j = loadNs(locale, expected);
            if (j && typeof j[k] === 'string') {
                vals.add(j[k]);
            }
        }
        if (vals.size > bestDistinct) {
            bestDistinct = vals.size;
            best = k;
        }
    }
    process.stdout.write(`\n[2] Locale coverage for '${expected}' using key "${best}":\n`);
    let present = 0;
    let testable = 0;
    const missing = [];
    for (const locale of LOCALES) {
        const j = loadNs(locale, expected);
        if (!j || typeof j[best] !== 'string') {
            continue;
        }
        const v = j[best];
        // skip values equal to english (can't distinguish) unless locale is en
        testable += 1;
        if (bundleHas(v)) {
            present += 1;
        } else {
            missing.push(locale);
        }
    }
    process.stdout.write(`  ${present}/${testable} locales' translated value present in bundle\n`);
    if (missing.length) {
        process.stdout.write(`  not-verbatim-matched (may share english value or be interpolated): ${missing.join(', ')}\n`);
    }
}
