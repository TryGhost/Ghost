import assert from 'assert/strict';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const TEST_FILE = fileURLToPath(import.meta.url);
const TEST_DIR = path.dirname(TEST_FILE);
const REPO_ROOT = path.resolve(TEST_DIR, '../../../..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'apps/shade/scripts/token-discipline-check.mjs');

const tempDirs = [];

function writeJson(filePath, value) {
    writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createFixtureRepo({sourceContent, baseline, allowlist}) {
    const root = mkdtempSync(path.join(tmpdir(), 'shade-token-discipline-'));
    tempDirs.push(root);

    const packageRoot = path.join(root, 'apps/shade');
    const componentsDir = path.join(packageRoot, 'src/components');
    const disciplineDir = path.join(packageRoot, 'token-discipline');

    mkdirSync(componentsDir, {recursive: true});
    mkdirSync(disciplineDir, {recursive: true});

    const sourcePath = path.join(componentsDir, 'fixture.tsx');
    writeFileSync(sourcePath, sourceContent);

    const baselinePath = path.join(disciplineDir, 'baseline.json');
    const allowlistPath = path.join(disciplineDir, 'allowlist.json');

    writeJson(baselinePath, baseline);
    writeJson(allowlistPath, allowlist);

    return {
        root,
        packageRoot,
        baselinePath,
        allowlistPath
    };
}

function runChecker(fixture, mode = 'ci') {
    const result = spawnSync('node', [
        SCRIPT_PATH,
        '--mode', mode,
        '--json',
        '--repo-root', fixture.root,
        '--package-root', fixture.packageRoot,
        '--baseline', fixture.baselinePath,
        '--allowlist', fixture.allowlistPath
    ], {
        encoding: 'utf8'
    });

    const report = result.stdout ? JSON.parse(result.stdout) : null;

    return {
        result,
        report
    };
}

describe('token-discipline-check script', function () {
    afterEach(function () {
        while (tempDirs.length > 0) {
            const directory = tempDirs.pop();
            rmSync(directory, {recursive: true, force: true});
        }
    });

    it('fails CI mode when new regressions are introduced', function () {
        const fixture = createFixtureRepo({
            sourceContent: 'export const Fixture = () => <div className="text-gray-700">x</div>;\n',
            baseline: {
                findings: {
                    raw_hex: [],
                    palette_class: [],
                    arbitrary_utility: []
                }
            },
            allowlist: {entries: []}
        });

        const {result, report} = runChecker(fixture);

        assert.equal(result.status, 1);
        assert.equal(report.regressions.palette_class.length, 1);
        assert.equal(report.regressions.raw_hex.length, 0);
        assert.equal(report.regressions.arbitrary_utility.length, 0);
    });

    it('passes CI mode when findings already exist in baseline', function () {
        const fixture = createFixtureRepo({
            sourceContent: 'export const Fixture = () => <div className="text-gray-700">x</div>;\n',
            baseline: {
                findings: {
                    raw_hex: [],
                    palette_class: [
                        {
                            file: 'apps/shade/src/components/fixture.tsx',
                            line: 1,
                            matches: ['text-gray-700']
                        }
                    ],
                    arbitrary_utility: []
                }
            },
            allowlist: {entries: []}
        });

        const {result, report} = runChecker(fixture);

        assert.equal(result.status, 0);
        assert.equal(report.regressions.palette_class.length, 0);
        assert.equal(report.configuration_errors.length, 0);
    });

    it('fails when allowlist entries are missing required reason metadata', function () {
        const fixture = createFixtureRepo({
            sourceContent: 'export const Fixture = () => <div style={{color: "#ffffff"}}>x</div>;\n',
            baseline: {
                findings: {
                    raw_hex: [],
                    palette_class: [],
                    arbitrary_utility: []
                }
            },
            allowlist: {
                entries: [
                    {
                        id: 'invalid-entry',
                        rule: 'raw_hex',
                        category: 'static_brand_asset',
                        file: 'apps/shade/src/components/fixture.tsx',
                        line: 1,
                        matches: ['#ffffff'],
                        review_by_milestone: 'ms-3'
                    }
                ]
            }
        });

        const {result, report} = runChecker(fixture);

        assert.equal(result.status, 1);
        assert.ok(report.configuration_errors.some(error => error.includes('missing required field: reason')));
    });
});
