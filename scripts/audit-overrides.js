#!/usr/bin/env node
'use strict';

// Validates root pnpm.overrides entries by toggling each one off in turn,
// re-resolving the lockfile, and re-running pnpm audit. An override is
// "moot" if removing it does not increase the audit count — meaning the
// dependency tree no longer depends on it (parents have caught up, or the
// vulnerable version is no longer reachable). Run periodically and after
// any major direct-dep bump to find overrides that can be retired.
//
// Usage: node scripts/audit-overrides.js [--only <name>]
//
// Refuses to run if package.json or pnpm-lock.yaml has uncommitted changes.
// Restores both files on exit (including SIGINT/SIGTERM).

const path = require('node:path');
const fs = require('node:fs');
const {execSync, spawnSync} = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const pkgPath = path.join(repoRoot, 'package.json');
const lockPath = path.join(repoRoot, 'pnpm-lock.yaml');

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const onlyKey = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

function readPkgRaw() {
    return fs.readFileSync(pkgPath, 'utf8');
}

function readLockRaw() {
    return fs.readFileSync(lockPath, 'utf8');
}

function detectIndent(raw) {
    const match = raw.match(/^\{\n([ \t]+)"/);
    return match ? match[1] : '  ';
}

function writePkg(pkg, originalRaw) {
    const indent = detectIndent(originalRaw);
    const trailingNewline = originalRaw.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, indent) + trailingNewline);
}

function ensureCleanWorkingTree() {
    const status = execSync('git status --porcelain package.json pnpm-lock.yaml', {
        cwd: repoRoot,
        encoding: 'utf8'
    }).trim();
    if (status) {
        console.error('Refusing to run: package.json or pnpm-lock.yaml has uncommitted changes.');
        console.error('Commit or stash first.');
        process.exit(1);
    }
}

function pnpmInstall() {
    const result = spawnSync('pnpm', ['install', '--silent'], {
        cwd: repoRoot,
        stdio: ['ignore', 'ignore', 'pipe'],
        encoding: 'utf8'
    });
    if (result.status !== 0) {
        const stderr = result.stderr || '';
        throw new Error(`pnpm install failed (exit ${result.status})\n${stderr.split('\n').slice(0, 20).join('\n')}`);
    }
}

function pnpmAudit() {
    const result = spawnSync('pnpm', ['audit', '--json'], {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
    });
    if (!result.stdout) {
        throw new Error(`pnpm audit produced no output (exit ${result.status})\n${result.stderr || ''}`);
    }
    return JSON.parse(result.stdout);
}

function summarize(audit) {
    const v = audit.metadata && audit.metadata.vulnerabilities ? audit.metadata.vulnerabilities : {};
    return {
        critical: v.critical || 0,
        high: v.high || 0,
        moderate: v.moderate || 0,
        low: v.low || 0,
        total: (v.critical || 0) + (v.high || 0) + (v.moderate || 0) + (v.low || 0)
    };
}

function advisoryFingerprint(audit) {
    const set = new Set();
    const advisories = audit.advisories || {};
    for (const adv of Object.values(advisories)) {
        const findings = adv.findings || [];
        for (const finding of findings) {
            for (const path of finding.paths || []) {
                set.add(`${adv.module_name}@${adv.vulnerable_versions}|${path}`);
            }
        }
    }
    return set;
}

function diffSets(baseline, probe) {
    const introduced = [];
    for (const k of probe) {
        if (!baseline.has(k)) {
            introduced.push(k);
        }
    }
    return introduced;
}

function formatRow(key, status, before, after, extra) {
    const delta = after.total - before.total;
    const sign = delta >= 0 ? '+' : '';
    return `${status.padEnd(7)} ${key.padEnd(45)} total ${before.total} → ${after.total} (${sign}${delta})${extra ? '  ' + extra : ''}`;
}

function main() {
    ensureCleanWorkingTree();

    const originalPkgRaw = readPkgRaw();
    const originalLockRaw = readLockRaw();
    const originalPkg = JSON.parse(originalPkgRaw);
    const overrides = (originalPkg.pnpm && originalPkg.pnpm.overrides) || {};
    let keys = Object.keys(overrides);

    if (onlyKey) {
        if (!keys.includes(onlyKey)) {
            console.error(`Override key not found: ${onlyKey}`);
            console.error(`Available: ${keys.join(', ')}`);
            process.exit(1);
        }
        keys = [onlyKey];
    }

    if (keys.length === 0) {
        console.log('No pnpm.overrides entries to validate.');
        return;
    }

    let restoring = false;
    function restore() {
        if (restoring) return;
        restoring = true;
        try {
            fs.writeFileSync(pkgPath, originalPkgRaw);
            fs.writeFileSync(lockPath, originalLockRaw);
            console.log('\nRestoring lockfile (pnpm install)...');
            pnpmInstall();
            console.log('Restored.');
        } catch (e) {
            console.error('Failed to restore cleanly:', e.message);
            console.error('Run `git checkout -- package.json pnpm-lock.yaml && pnpm install` manually.');
        }
    }

    process.on('SIGINT', () => {
        console.log('\nInterrupted.');
        restore();
        process.exit(130);
    });
    process.on('SIGTERM', () => {
        restore();
        process.exit(143);
    });

    console.log(`Validating ${keys.length} pnpm.overrides entr${keys.length === 1 ? 'y' : 'ies'}\n`);

    console.log('Capturing baseline audit...');
    const baselineAudit = pnpmAudit();
    const baselineSummary = summarize(baselineAudit);
    const baselineFingerprint = advisoryFingerprint(baselineAudit);
    console.log(`Baseline: total=${baselineSummary.total} (crit=${baselineSummary.critical} high=${baselineSummary.high} mod=${baselineSummary.moderate} low=${baselineSummary.low})\n`);

    const results = [];

    try {
        for (const key of keys) {
            const replacement = overrides[key];
            process.stdout.write(`Probing ${key} → ${replacement} ... `);

            const modified = JSON.parse(originalPkgRaw);
            delete modified.pnpm.overrides[key];
            writePkg(modified, originalPkgRaw);

            try {
                pnpmInstall();
            } catch (e) {
                console.log('install failed → ACTIVE (cannot resolve without override)');
                results.push({key, replacement, status: 'ACTIVE_BLOCKING', before: baselineSummary, after: baselineSummary, introduced: []});
                fs.writeFileSync(pkgPath, originalPkgRaw);
                fs.writeFileSync(lockPath, originalLockRaw);
                continue;
            }

            const probeAudit = pnpmAudit();
            const probeSummary = summarize(probeAudit);
            const probeFingerprint = advisoryFingerprint(probeAudit);
            const introduced = diffSets(baselineFingerprint, probeFingerprint);

            const totalDelta = probeSummary.total - baselineSummary.total;
            let status;
            if (totalDelta <= 0 && introduced.length === 0) {
                status = 'MOOT';
            } else if (introduced.length > 0) {
                status = 'ACTIVE';
            } else {
                status = 'NEUTRAL';
            }

            console.log(`${status} (Δ${totalDelta >= 0 ? '+' : ''}${totalDelta}, +${introduced.length} advisories reintroduced)`);
            results.push({key, replacement, status, before: baselineSummary, after: probeSummary, introduced});

            fs.writeFileSync(pkgPath, originalPkgRaw);
            fs.writeFileSync(lockPath, originalLockRaw);
        }
    } finally {
        restore();
    }

    console.log('\n=== Summary ===');
    const moot = results.filter(r => r.status === 'MOOT');
    const active = results.filter(r => r.status === 'ACTIVE');
    const blocking = results.filter(r => r.status === 'ACTIVE_BLOCKING');
    const neutral = results.filter(r => r.status === 'NEUTRAL');

    console.log(`MOOT:    ${moot.length}  (override is dead weight; safe to remove)`);
    console.log(`ACTIVE:  ${active.length}  (removal reintroduces advisories; keep)`);
    console.log(`ACTIVE_BLOCKING: ${blocking.length}  (install fails without override; keep)`);
    console.log(`NEUTRAL: ${neutral.length}  (no advisory delta but resolution differs; possibly removable)`);

    if (moot.length > 0) {
        console.log('\nCandidates to remove from pnpm.overrides:');
        for (const r of moot) {
            console.log(`  - "${r.key}": "${r.replacement}"`);
        }
    }
    if (active.length > 0) {
        console.log('\nActive overrides (keep):');
        for (const r of active) {
            const sample = r.introduced.slice(0, 2).map(s => s.split('|')[0]).join(', ');
            console.log(`  - ${r.key}  (reintroduces ${r.introduced.length} paths, e.g. ${sample})`);
        }
    }

    process.exitCode = moot.length > 0 ? 0 : 0;
}

main();
