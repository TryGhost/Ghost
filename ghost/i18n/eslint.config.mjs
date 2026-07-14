import {nodeLibConfig, noGhostIgnitionRequireRule} from '@internal/cfg-eslint';

export default [{
    // Generated locale registries and ESM entry glue are code-generated / hand-authored
    // ESM shims; they're not part of the linted CJS source surface.
    ignores: ['lib/registry/**', 'build/**']
}, ...nodeLibConfig({
    // ghost/i18n is JS-only (CommonJS) and uses the local-filenames variant of
    // match-regex instead of the ghost-plugin one. legacyLocalFilenames handles both.
    typescript: false,
    commonjs: true,
    legacyLocalFilenames: true,
    srcGlobs: ['*.js', 'lib/**/*.js'],
    testGlobs: ['test/**/*.js'],
    extraSrcRules: {
        ...noGhostIgnitionRequireRule,
        // Use the local-filenames variant (workspace-local plugin). The shared
        // factory's legacyLocalFilenames flag turned off the ghost/filenames one
        // for us already.
        'local-filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
    },
    extraTestRules: {
        ...noGhostIgnitionRequireRule,
        'local-filenames/match-regex': ['error', '^[a-z0-9.-]+$', false],
        'ghost/ghost-custom/node-assert-strict': 'error'
    },
    extraBlocks: [
        {
            // Keep the index entry points small — they're public surface.
            files: ['lib/**/index.js', 'index.js'],
            rules: {'max-lines': ['error', {skipBlankLines: true, skipComments: true, max: 50}]}
        },
        {
            // Hand-authored ESM entry glue (lib/esm-factory.mjs). Lint it as real ESM so
            // it isn't silently rule-less. The generated lib/registry/** stays ignored.
            files: ['*.mjs', 'lib/**/*.mjs'],
            languageOptions: {sourceType: 'module'},
            rules: {
                'no-unused-vars': 'error',
                'no-undef': 'error'
            }
        }
    ]
})];

