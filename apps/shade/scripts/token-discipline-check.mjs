#!/usr/bin/env node

import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const DEFAULT_PACKAGE_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
const DEFAULT_REPO_ROOT = path.resolve(DEFAULT_PACKAGE_ROOT, '..', '..');

const DEFAULT_INCLUDE = ['src/components', 'src/providers'];
const DEFAULT_BASELINE = 'token-discipline/baseline.json';
const DEFAULT_ALLOWLIST = 'token-discipline/allowlist.json';
const MODE_REPORT = 'report';
const MODE_NO_NEW = 'no-new';
const MODE_STRICT = 'strict';
const LEGACY_MODE_CI = 'ci';
const VALID_MODES = new Set([MODE_REPORT, MODE_NO_NEW, MODE_STRICT, LEGACY_MODE_CI]);

const RULES = {
    raw_hex: /#[0-9a-fA-F]{3,8}\b/g,
    palette_class: /\b(?:bg|text|border|fill|stroke)-[a-z]+-[0-9]{2,3}\b/g,
    arbitrary_utility: /\b[a-z-]+-\[[^\]]+\]/g
};

const REQUIRED_ALLOWLIST_FIELDS = ['id', 'rule', 'category', 'owner', 'file', 'line', 'matches', 'reason', 'review_by_milestone'];

function toPosixPath(value) {
    return value.split(path.sep).join('/');
}

function findingKey(rule, file, line) {
    return `${rule}|${file}|${line}`;
}

function shouldSkipFile(filePath) {
    const normalized = toPosixPath(filePath);
    const fileName = path.basename(filePath);

    if (normalized.includes('/docs/')) {
        return true;
    }

    return fileName.includes('.stories.') || fileName.includes('.test.') || fileName.endsWith('.mdx');
}

async function walkFiles(rootDir) {
    const queue = [rootDir];
    const files = [];

    while (queue.length > 0) {
        const current = queue.pop();
        if (!current) {
            continue;
        }

        let entries;
        try {
            entries = await readdir(current, {withFileTypes: true});
        } catch {
            continue;
        }

        for (const entry of entries) {
            const absolute = path.join(current, entry.name);
            if (entry.isDirectory()) {
                queue.push(absolute);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const ext = path.extname(entry.name);
            if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
                continue;
            }

            if (shouldSkipFile(absolute)) {
                continue;
            }

            files.push(absolute);
        }
    }

    return files.sort((a, b) => a.localeCompare(b));
}

async function scanScope({repoRoot, includePaths}) {
    const scannedFiles = [];
    const findings = {
        raw_hex: [],
        palette_class: [],
        arbitrary_utility: []
    };

    for (const includePath of includePaths) {
        const files = await walkFiles(includePath);

        for (const absoluteFile of files) {
            scannedFiles.push(absoluteFile);

            const relativeFile = toPosixPath(path.relative(repoRoot, absoluteFile));
            const content = await readFile(absoluteFile, 'utf8');
            const lines = content.split('\n');

            for (let index = 0; index < lines.length; index += 1) {
                const lineNumber = index + 1;
                const line = lines[index] || '';

                for (const [ruleName, regex] of Object.entries(RULES)) {
                    regex.lastIndex = 0;
                    const matches = Array.from(new Set(line.match(regex) || [])).sort();

                    if (matches.length > 0) {
                        findings[ruleName].push({
                            file: relativeFile,
                            line: lineNumber,
                            matches
                        });
                    }
                }
            }
        }
    }

    return {
        scanned_files: scannedFiles.length,
        findings
    };
}

function validateAllowlist(allowlist) {
    const errors = [];

    if (!allowlist || typeof allowlist !== 'object') {
        errors.push('Allowlist must be a JSON object.');
        return errors;
    }

    if (!Array.isArray(allowlist.entries)) {
        errors.push('Allowlist must contain an entries array.');
        return errors;
    }

    for (const entry of allowlist.entries) {
        for (const field of REQUIRED_ALLOWLIST_FIELDS) {
            if (!(field in entry)) {
                errors.push(`Allowlist entry is missing required field: ${field}`);
            }
        }

        if (entry && !Object.keys(RULES).includes(entry.rule)) {
            errors.push(`Allowlist entry has unknown rule: ${String(entry.rule)}`);
        }

        if (entry && (!Number.isInteger(entry.line) || entry.line <= 0)) {
            errors.push(`Allowlist entry has invalid line for ${entry.file || '<unknown>'}`);
        }

        if (entry && !Array.isArray(entry.matches)) {
            errors.push(`Allowlist entry has invalid matches for ${entry.file || '<unknown>'}`);
        }
    }

    return errors;
}

function buildAllowlistIndex(allowlist) {
    const index = new Map();

    for (const entry of allowlist.entries) {
        const key = findingKey(entry.rule, entry.file, entry.line);
        if (!index.has(key)) {
            index.set(key, []);
        }
        index.get(key).push(entry);
    }

    return index;
}

function isAllowlisted(rule, finding, allowlistIndex) {
    const key = findingKey(rule, finding.file, finding.line);
    const candidates = allowlistIndex.get(key) || [];

    if (candidates.length === 0) {
        return false;
    }

    return candidates.some((entry) => {
        if (!Array.isArray(entry.matches) || entry.matches.length === 0) {
            return true;
        }

        const allowedMatches = new Set(entry.matches);
        return finding.matches.every(value => allowedMatches.has(value));
    });
}

function buildBaselineIndex(baseline) {
    const result = {
        raw_hex: new Set(),
        palette_class: new Set(),
        arbitrary_utility: new Set()
    };

    const baselineFindings = baseline?.findings || {};

    for (const rule of Object.keys(result)) {
        const rows = Array.isArray(baselineFindings[rule]) ? baselineFindings[rule] : [];
        for (const row of rows) {
            if (row && typeof row.file === 'string' && Number.isInteger(row.line)) {
                result[rule].add(findingKey(rule, row.file, row.line));
            }
        }
    }

    return result;
}

function summarizeByFile(items) {
    const counts = new Map();
    for (const item of items) {
        counts.set(item.file, (counts.get(item.file) || 0) + 1);
    }

    return Array.from(counts.entries())
        .map(([file, count]) => ({file, count}))
        .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
}

async function parseJsonFile(filePath) {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
}

function normalizeMode(mode) {
    if (mode === LEGACY_MODE_CI) {
        return MODE_NO_NEW;
    }

    return mode;
}

function validateMode(mode) {
    if (!VALID_MODES.has(mode)) {
        throw new Error(`Invalid mode "${mode}". Supported modes: report, no-new, strict.`);
    }
}

function parseArgs(argv) {
    const options = {
        mode: MODE_REPORT,
        outputJson: false,
        include: [],
        repoRoot: DEFAULT_REPO_ROOT,
        packageRoot: DEFAULT_PACKAGE_ROOT
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === '--mode') {
            options.mode = argv[i + 1] || 'report';
            i += 1;
        } else if (arg === '--json') {
            options.outputJson = true;
        } else if (arg === '--repo-root') {
            options.repoRoot = path.resolve(argv[i + 1] || DEFAULT_REPO_ROOT);
            i += 1;
        } else if (arg === '--package-root') {
            options.packageRoot = path.resolve(argv[i + 1] || DEFAULT_PACKAGE_ROOT);
            i += 1;
        } else if (arg === '--baseline') {
            options.baselinePath = path.resolve(argv[i + 1] || DEFAULT_BASELINE);
            i += 1;
        } else if (arg === '--allowlist') {
            options.allowlistPath = path.resolve(argv[i + 1] || DEFAULT_ALLOWLIST);
            i += 1;
        } else if (arg === '--include') {
            options.include.push(path.resolve(argv[i + 1] || '.'));
            i += 1;
        }
    }

    if (!options.baselinePath) {
        options.baselinePath = path.resolve(options.packageRoot, DEFAULT_BASELINE);
    }

    if (!options.allowlistPath) {
        options.allowlistPath = path.resolve(options.packageRoot, DEFAULT_ALLOWLIST);
    }

    if (options.include.length === 0) {
        options.include = DEFAULT_INCLUDE.map(value => path.resolve(options.packageRoot, value));
    }

    validateMode(options.mode);
    options.mode = normalizeMode(options.mode);

    return options;
}

function printHumanReport(report) {
    const summary = report.summary;
    // eslint-disable-next-line no-console
    console.log('Token discipline scan summary:');
    // eslint-disable-next-line no-console
    console.log(`  files_scanned: ${summary.files_scanned}`);
    // eslint-disable-next-line no-console
    console.log(`  raw_hex: ${summary.raw_hex}`);
    // eslint-disable-next-line no-console
    console.log(`  palette_class: ${summary.palette_class}`);
    // eslint-disable-next-line no-console
    console.log(`  arbitrary_utility: ${summary.arbitrary_utility}`);

    if (report.mode === MODE_NO_NEW) {
        // eslint-disable-next-line no-console
        console.log('No-new gate:');
        // eslint-disable-next-line no-console
        console.log(`  regressions raw_hex: ${report.regressions.raw_hex.length}`);
        // eslint-disable-next-line no-console
        console.log(`  regressions palette_class: ${report.regressions.palette_class.length}`);
        // eslint-disable-next-line no-console
        console.log(`  regressions arbitrary_utility: ${report.regressions.arbitrary_utility.length}`);
        // eslint-disable-next-line no-console
        console.log(`  allowlisted findings: ${report.allowlisted_count}`);

        if (report.configuration_errors.length > 0) {
            // eslint-disable-next-line no-console
            console.log('Configuration errors:');
            for (const error of report.configuration_errors) {
                // eslint-disable-next-line no-console
                console.log(`  - ${error}`);
            }
        }
    } else if (report.mode === MODE_STRICT) {
        // eslint-disable-next-line no-console
        console.log('Strict gate:');
        // eslint-disable-next-line no-console
        console.log(`  violations raw_hex: ${report.strict_violations.raw_hex.length}`);
        // eslint-disable-next-line no-console
        console.log(`  violations palette_class: ${report.strict_violations.palette_class.length}`);
        // eslint-disable-next-line no-console
        console.log(`  violations arbitrary_utility: ${report.strict_violations.arbitrary_utility.length}`);
        // eslint-disable-next-line no-console
        console.log(`  allowlisted findings: ${report.allowlisted_count}`);

        if (report.configuration_errors.length > 0) {
            // eslint-disable-next-line no-console
            console.log('Configuration errors:');
            for (const error of report.configuration_errors) {
                // eslint-disable-next-line no-console
                console.log(`  - ${error}`);
            }
        }
    }

    const hotspots = summarizeByFile([
        ...report.active_findings.raw_hex,
        ...report.active_findings.palette_class,
        ...report.active_findings.arbitrary_utility
    ]).slice(0, 10);

    if (hotspots.length > 0) {
        // eslint-disable-next-line no-console
        console.log('Top files by active findings:');
        for (const hotspot of hotspots) {
            // eslint-disable-next-line no-console
            console.log(`  - ${hotspot.file}: ${hotspot.count}`);
        }
    }
}

export async function runTokenDisciplineCheck(customOptions = {}) {
    const options = {
        ...parseArgs([]),
        ...customOptions
    };
    validateMode(options.mode);
    options.mode = normalizeMode(options.mode);

    const scan = await scanScope({
        repoRoot: options.repoRoot,
        includePaths: options.include
    });

    let allowlist = {entries: []};
    let baseline = {findings: {}};
    const configurationErrors = [];

    try {
        allowlist = await parseJsonFile(options.allowlistPath);
    } catch (error) {
        configurationErrors.push(`Failed to load allowlist: ${String(error.message || error)}`);
    }

    const allowlistErrors = validateAllowlist(allowlist);
    configurationErrors.push(...allowlistErrors);

    if (options.mode === MODE_NO_NEW) {
        try {
            baseline = await parseJsonFile(options.baselinePath);
        } catch (error) {
            configurationErrors.push(`Failed to load baseline: ${String(error.message || error)}`);
        }
    }

    const allowlistIndex = buildAllowlistIndex(allowlist?.entries ? allowlist : {entries: []});
    const activeFindings = {
        raw_hex: [],
        palette_class: [],
        arbitrary_utility: []
    };
    let allowlistedCount = 0;

    for (const rule of Object.keys(activeFindings)) {
        for (const finding of scan.findings[rule]) {
            if (isAllowlisted(rule, finding, allowlistIndex)) {
                allowlistedCount += 1;
                continue;
            }
            activeFindings[rule].push(finding);
        }
    }

    const baselineIndex = buildBaselineIndex(baseline);
    const regressions = {
        raw_hex: [],
        palette_class: [],
        arbitrary_utility: []
    };

    if (options.mode === MODE_NO_NEW) {
        for (const rule of Object.keys(regressions)) {
            for (const finding of activeFindings[rule]) {
                const key = findingKey(rule, finding.file, finding.line);
                if (!baselineIndex[rule].has(key)) {
                    regressions[rule].push(finding);
                }
            }
        }
    }

    const strictViolations = {
        raw_hex: [],
        palette_class: [],
        arbitrary_utility: []
    };

    if (options.mode === MODE_STRICT) {
        for (const rule of Object.keys(strictViolations)) {
            strictViolations[rule] = activeFindings[rule];
        }
    }

    const report = {
        mode: options.mode,
        summary: {
            files_scanned: scan.scanned_files,
            raw_hex: scan.findings.raw_hex.length,
            palette_class: scan.findings.palette_class.length,
            arbitrary_utility: scan.findings.arbitrary_utility.length
        },
        active_findings: activeFindings,
        regressions,
        strict_violations: strictViolations,
        allowlisted_count: allowlistedCount,
        configuration_errors: configurationErrors,
        baseline_path: options.baselinePath,
        allowlist_path: options.allowlistPath
    };

    const hasRegression = Object.values(regressions).some(rows => rows.length > 0);
    const hasStrictViolations = Object.values(strictViolations).some(rows => rows.length > 0);
    const hasConfigErrors = configurationErrors.length > 0;
    const failed = (options.mode === MODE_NO_NEW && (hasRegression || hasConfigErrors))
        || (options.mode === MODE_STRICT && (hasStrictViolations || hasConfigErrors));

    return {
        report,
        exitCode: failed ? 1 : 0
    };
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const {report, exitCode} = await runTokenDisciplineCheck(options);

    if (options.outputJson) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(report, null, 2));
    } else {
        printHumanReport(report);
    }

    process.exitCode = exitCode;
}

if (import.meta.url === `file://${SCRIPT_FILE}`) {
    main();
}
