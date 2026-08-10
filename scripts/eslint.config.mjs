import {nodeLibConfig} from '@internal/cfg-eslint';

// This package is `type: module`, so `.js` is ESM and the not-yet-migrated
// legacy files carry an explicit `.cjs`. Hence two passes over nodeLibConfig:
// one per module system. Migrating a file is a rename from `.cjs` to `.js`
// plus require->import — it moves between these blocks with no config change
// here, and the block for `.cjs` disappears once the last one is converted.
//
// These are CLI entrypoints, not a library, so a few nodeLibConfig defaults
// are relaxed below.
const cliRules = {
    // Writing to stdout/stderr is the entire job of these scripts.
    'no-console': 'off',
    // nodeLibConfig bans top-level await because it breaks `require(esm)`
    // consumers like ghost/core. Nothing requires these files — they are run
    // directly by node — so the hazard doesn't exist here.
    'no-restricted-syntax': 'off',
    // @tryghost/errors is a server-runtime concern; scripts throw native
    // Errors and let node print the stack.
    'ghost/ghost-custom/no-native-error': 'off'
};

export default [
    ...nodeLibConfig({
        typescript: false,
        srcGlobs: ['*.js', 'lib/**/*.js'],
        testGlobs: ['test/**/*.test.js'],
        extraSrcRules: cliRules,
        extraTestRules: cliRules
    }),
    ...nodeLibConfig({
        typescript: false,
        commonjs: true,
        srcGlobs: ['*.cjs', 'lib/**/*.cjs'],
        testGlobs: ['test/**/*.test.cjs'],
        extraSrcRules: cliRules,
        extraTestRules: cliRules
    })
];
