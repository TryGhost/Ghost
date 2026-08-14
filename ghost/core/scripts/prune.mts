#!/usr/bin/env node

/**
 * prune.mts — Strip files no consumer loads from a built Ghost tree.
 *
 * Two callers, two profiles:
 *
 *   image   — Dockerfile.production's deploy stage, against /home/ghost (Ghost's
 *             `files` set + a resolved production node_modules). The COPY layer
 *             that follows is extracted single-threaded, once per CI E2E shard,
 *             and that cost scales with file count rather than bytes.
 *   archive — scripts/pack.mjs, against the extracted package/ dir. No
 *             node_modules there (the consumer installs its own), so only the
 *             source rules apply.
 *
 * Run directly by node (type stripping, no build step) — `scripts/` is outside
 * the tsconfig `include`, so nothing compiles this.
 *
 * The exclusions below are load-bearing — each is something a naive version of
 * the rule deleted and broke. Keep them, and prefer `--dry-run` over reasoning
 * about a glob.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';

export type Profile = 'image' | 'archive';

interface Rule {
    name: string;
    profiles: Profile[];
    summary: string;
    match: (rel: string) => boolean;
}

export interface PruneResult {
    total: number;
    removed: number;
    bytes: number;
    byRule: Record<string, {files: number, bytes: number}>;
}

// Script files are never build inputs, whatever directory they sit in.
const isScript = (base: string): boolean => /\.(js|json|mjs|cjs|node)$/.test(base);

const RULES: Rule[] = [
    {
        name: 'source',
        profiles: ['image', 'archive'],
        summary: 'TypeScript sources, declarations and sourcemaps',
        // build:tsc emits a .js beside every .ts in the shipped set, and nothing
        // runs node with --enable-source-maps (Sentry resolves frames from maps
        // uploaded at release time, not from disk). `[cm]?ts` covers the
        // declaration variants too — .d.ts, .d.mts, .d.cts.
        match: rel => /\.(?:[cm]?ts|tsx|map)$/.test(rel)
    },
    {
        name: 'docs',
        profiles: ['image'],
        summary: 'Dependency READMEs, changelogs and contributor lists',
        match(rel) {
            // Scoped to the app roots: content/'s READMEs ship deliberately (they
            // are ghost/core `files` entries, and what a self-hoster sees in each
            // content dir).
            if (!['node_modules/', 'core/', 'bin/'].some(root => rel.startsWith(root))) {
                return false;
            }

            // Self-hosters deploy their own Tinybird from these datafiles, so the
            // docs explaining how are not ours to drop.
            if (rel.includes('/data/tinybird/')) {
                return false;
            }

            const base = path.basename(rel);
            if (/^(licen[sc]e|notice)/i.test(base)) {
                return false;
            }

            return /\.md$/i.test(base) || /^(history|authors)$/i.test(base);
        }
    },
    {
        name: 'native',
        profiles: ['image'],
        summary: 'Vendored C/C++ trees and addon sources',
        match(rel) {
            if (!rel.startsWith('node_modules/')) {
                return false;
            }

            const base = path.basename(rel);

            // vendor/ is not always C: no-case, chalk and @sentry/* ship runtime
            // .js under one.
            if (rel.includes('/vendor/')) {
                return !isScript(base);
            }

            // The prebuilt .node binaries stay — only their build inputs go. A
            // node-gyp rebuild is already impossible in the image (no toolchain
            // is installed, deliberately), so nothing reads these.
            return /\.(cc|cpp|cxx|c|h|hpp|hxx|gyp|gypi)$/.test(base);
        }
    }
];

export const PROFILES: Profile[] = ['image', 'archive'];

/**
 * Walk `dir` and yield every regular file, as a path relative to `dir`.
 * Symlinks are never followed — pnpm's virtual store is full of them, and each
 * target is reached once via .pnpm anyway.
 */
async function* walk(dir: string, prefix = ''): AsyncGenerator<string> {
    const entries = await fs.readdir(path.join(dir, prefix), {withFileTypes: true});

    for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            yield* walk(dir, rel);
        } else if (entry.isFile()) {
            yield rel;
        }
    }
}

export async function prune(target: string, {profile, dryRun = false}: {profile: Profile, dryRun?: boolean}): Promise<PruneResult> {
    if (!PROFILES.includes(profile)) {
        throw new Error(`Unknown profile "${profile}" (expected one of: ${PROFILES.join(', ')})`);
    }

    const rules = RULES.filter(rule => rule.profiles.includes(profile));
    const byRule = Object.fromEntries(rules.map(rule => [rule.name, {files: 0, bytes: 0}]));
    let total = 0;
    let removed = 0;
    let bytes = 0;

    for await (const rel of walk(target)) {
        total += 1;
        const rule = rules.find(r => r.match(rel));
        if (!rule) {
            continue;
        }

        const absolute = path.join(target, rel);
        const {size} = await fs.stat(absolute);
        if (!dryRun) {
            await fs.rm(absolute);
        }

        byRule[rule.name].files += 1;
        byRule[rule.name].bytes += size;
        removed += 1;
        bytes += size;
    }

    return {total, removed, bytes, byRule};
}

const mib = (value: number): string => `${(value / 1024 / 1024).toFixed(1)} MiB`;

/**
 * Print a per-rule breakdown. Callers embed this in their own build output, so
 * it takes no leading label of its own.
 */
export function reportPrune(result: PruneResult, {dryRun = false} = {}): void {
    for (const rule of RULES) {
        const stats = result.byRule[rule.name];
        if (stats) {
            console.log(`  ${rule.name.padEnd(7)} ${String(stats.files).padStart(6)} files  ${mib(stats.bytes).padStart(9)}  ${rule.summary}`);
        }
    }
    console.log(`  ${dryRun ? 'would remove' : 'removed'} ${result.removed} of ${result.total} files (${mib(result.bytes)})`);
}

if (import.meta.main) {
    const {values, positionals} = parseArgs({
        allowPositionals: true,
        options: {
            profile: {type: 'string'},
            'dry-run': {type: 'boolean', default: false}
        }
    });

    const [target] = positionals;
    const profile = values.profile as Profile | undefined;
    if (!target || !profile) {
        console.error('Usage: prune.mts <target-dir> --profile=<image|archive> [--dry-run]');
        process.exit(1);
    }

    console.log(`Pruning ${target} (profile: ${profile})`);
    const result = await prune(path.resolve(target), {profile, dryRun: values['dry-run']});
    reportPrune(result, {dryRun: values['dry-run']});
}
