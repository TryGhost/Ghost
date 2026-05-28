'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert');
const {buildPlan, projectForPath} = require('./ci-plan');

function plan(input) {
    return buildPlan({
        base: 'base',
        head: 'head',
        eventName: 'pull_request',
        affectedProjects: [],
        unitTestProjects: [],
        playwrightProjects: [
            '@tryghost/activitypub',
            '@tryghost/admin-x-settings',
            '@tryghost/comments-ui'
        ],
        i18nProjects: [],
        ...input
    }).outputs;
}

function includeMatrix(output) {
    return JSON.parse(output).include;
}

describe('ci-plan', () => {
    it('maps files to workspace projects', () => {
        assert.strictEqual(projectForPath('ghost/core/package.json'), 'ghost');
        assert.strictEqual(projectForPath('apps/admin-x-settings/src/App.tsx'), '@tryghost/admin-x-settings');
        assert.strictEqual(projectForPath('e2e/tests/public/homepage.test.ts'), '@tryghost/e2e');
    });

    it('skips expensive lanes for docs-only changes', () => {
        const outputs = plan({
            changedFiles: ['docs/README.md', 'adr/0001-aaa-test-structure.md']
        });

        assert.strictEqual(outputs.changed_any_code, 'false');
        assert.strictEqual(outputs.changed_core, 'false');
        assert.strictEqual(outputs.run_e2e, 'false');
        assert.deepStrictEqual(includeMatrix(outputs.unit_test_matrix), []);
        assert.deepStrictEqual(includeMatrix(outputs.app_acceptance_matrix), []);
    });

    it('does not turn lockfile-only Renovate changes into full-repo CI', () => {
        const outputs = plan({
            changedFiles: ['pnpm-lock.yaml', 'pnpm-workspace.yaml']
        });

        assert.strictEqual(outputs.changed_any_code, 'true');
        assert.strictEqual(outputs.changed_core, 'false');
        assert.strictEqual(outputs.run_e2e, 'false');
        assert.strictEqual(outputs.lint_projects_str, '');
        assert.deepStrictEqual(includeMatrix(outputs.core_db_matrix), []);
    });

    it('maps core runtime dependency updates to core lanes only', () => {
        const outputs = plan({
            changedFiles: ['ghost/core/package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'],
            manifestDiffs: [{
                file: 'ghost/core/package.json',
                project: 'ghost',
                changedDeps: [{
                    name: 'mysql2',
                    section: 'dependencies',
                    before: '3.18.1',
                    after: '3.22.3'
                }]
            }]
        });

        assert.strictEqual(outputs.changed_core, 'true');
        assert.strictEqual(outputs.run_e2e, 'false');
        assert.strictEqual(outputs.lint_projects_str, 'ghost');
        assert.strictEqual(outputs.unit_test_projects_str, 'ghost');
        assert.strictEqual(includeMatrix(outputs.unit_test_matrix).length, 4);
        assert.deepStrictEqual(includeMatrix(outputs.app_acceptance_matrix), []);
        assert.deepStrictEqual(includeMatrix(outputs.e2e_matrix), []);
    });

    it('maps Playwright updates to browser/app acceptance lanes', () => {
        const outputs = plan({
            changedFiles: ['package.json', 'pnpm-lock.yaml'],
            manifestDiffs: [{
                file: 'package.json',
                project: null,
                changedDeps: [{
                    name: '@playwright/test',
                    section: 'devDependencies',
                    before: '1.59.0',
                    after: '1.60.0'
                }]
            }]
        });

        assert.strictEqual(outputs.run_e2e, 'true');
        assert.ok(includeMatrix(outputs.app_acceptance_matrix).some(item => item.app === '@tryghost/admin-x-settings'));
        assert.ok(includeMatrix(outputs.app_acceptance_matrix).some(item => item.app === '@tryghost/admin-x-settings' && item.shardTotal === 4));
        assert.ok(includeMatrix(outputs.e2e_matrix).length > 0);
    });

    it('maps root tooling updates to tooling lanes instead of no-op CI', () => {
        const outputs = plan({
            changedFiles: ['package.json', 'pnpm-lock.yaml'],
            affectedProjects: [],
            unitTestProjects: ['ghost', '@tryghost/admin-x-settings'],
            manifestDiffs: [{
                file: 'package.json',
                project: null,
                changedDeps: [{
                    name: 'knip',
                    section: 'devDependencies',
                    before: '6.12.0',
                    after: '6.14.2'
                }]
            }]
        });

        assert.strictEqual(outputs.changed_core, 'false');
        assert.strictEqual(outputs.run_e2e, 'false');
        assert.notStrictEqual(outputs.lint_projects_str, '');
        assert.deepStrictEqual(includeMatrix(outputs.core_db_matrix), []);
        assert.deepStrictEqual(includeMatrix(outputs.app_acceptance_matrix), []);
    });

    it('runs full matrices for CI workflow changes', () => {
        const outputs = plan({
            changedFiles: ['.github/workflows/ci.yml'],
            affectedProjects: ['ghost', '@tryghost/admin-x-settings'],
            unitTestProjects: ['ghost'],
            playwrightProjects: ['@tryghost/admin-x-settings']
        });

        assert.strictEqual(outputs.changed_core, 'true');
        assert.strictEqual(outputs.run_e2e, 'true');
        assert.strictEqual(outputs.run_coverage, 'true');
        assert.ok(outputs.affected_projects_str.includes('ghost'));
        assert.ok(outputs.affected_projects_str.includes('@tryghost/admin-x-settings'));
        assert.ok(includeMatrix(outputs.core_db_matrix).some(item => item.suite === 'legacy'));
    });
});
