import path from 'path';
import {mergeConfig} from 'vitest/config';
// Import the helper from source rather than the package entry — at test
// time `apps/admin-x-framework/dist/` may not exist, and the resolve.alias
// entries below only take effect after this config has loaded.
import {createVitestConfig} from '../admin-x-framework/src/test/vitest-config';

const root = __dirname;
const workspaceRoot = path.resolve(root, '../..');

// Cross-package workspace aliases so `test:unit` can run without `nx build`
// having produced `apps/shade/es` or `apps/admin-x-framework/dist`. The
// package `exports` of those workspaces point at built artifacts; for tests
// we resolve to source directly. Tracked in PLA-42 — this config is the pilot
// for the pattern.
const workspaceSrcAliases = [
    {find: /^@tryghost\/shade$/, replacement: path.resolve(workspaceRoot, 'apps/shade/src/index.ts')},
    {find: /^@tryghost\/shade\/(.+)$/, replacement: path.resolve(workspaceRoot, 'apps/shade/src') + '/$1.ts'},
    {find: /^@tryghost\/admin-x-framework$/, replacement: path.resolve(workspaceRoot, 'apps/admin-x-framework/src/index.ts')},
    {find: /^@tryghost\/admin-x-framework\/(.+)$/, replacement: path.resolve(workspaceRoot, 'apps/admin-x-framework/src') + '/$1.ts'},
    // `@/` is shade's internal alias (apps/shade/tsconfig.json `paths`). When
    // we resolve shade source here, those imports also need a target.
    {find: /^@\/(.+)$/, replacement: path.resolve(workspaceRoot, 'apps/shade/src') + '/$1'}
];

export default mergeConfig(createVitestConfig({root}), {
    resolve: {
        alias: workspaceSrcAliases
    }
});
