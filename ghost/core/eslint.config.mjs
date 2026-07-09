import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import tseslint from 'typescript-eslint';

import {
    correctnessRules,
    jsUnusedVarsRule,
    localFilenamesPlugin,
    mochaRulesOff,
    nodeLibRules,
    strictLinterOptions
} from '../../eslint.shared.mjs';

// nodeLibRules + jsUnusedVarsRule covers the bulk. Two workspace-specific:
// turn off ghost/filenames/match-regex (we use local-filenames/match-regex in
// scoped blocks below) and no-unused-private-class-members (codebase has
// intentional placeholder private fields; ESLint 9 added this rule to
// recommended without warning).
const ghostBaseRules = {
    ...nodeLibRules,
    ...jsUnusedVarsRule,
    'ghost/filenames/match-regex': 'off',
    'no-unused-private-class-members': 'off'
};

const mochaRulesOffForGhost = mochaRulesOff(ghostPlugin);

// LEGACY: typescript-eslint v8's recommended ruleset is stricter than the old
// plugin:ghost/ts posture. These overrides restore the previous behavior so
// the TS migration isn't blocked. Re-enabling each is its own cleanup PR
// (counts are codebase-wide and large — flipping any would block this PR).
// Applied across 4 file-glob blocks in ghost/core to ensure they win over
// every tseslint extends in the chain.
const tsLegacyRelaxations = {
    // LEGACY: tseslint v8 default. Switching means cleaning up CommonJS
    // `require()` calls across hundreds of .ts files.
    '@typescript-eslint/no-require-imports': 'off',
    // LEGACY: tseslint v8 default. Codebase uses `expect(x).to.be.true`
    // patterns that read as unused expressions.
    '@typescript-eslint/no-unused-expressions': 'off',
    // LEGACY: tseslint v8 default. `Function` used as a type for callbacks.
    '@typescript-eslint/no-unsafe-function-type': 'off',
    // LEGACY: tseslint v8 default. `// @ts-ignore` comments still exist.
    '@typescript-eslint/ban-ts-comment': 'off',
    // LEGACY: previous posture from plugin:ghost/ts allowed inferrable types.
    '@typescript-eslint/no-inferrable-types': 'off',
    // LEGACY: `let` declarations across the codebase could be `const`.
    'prefer-const': 'off'
};

const migrationLoopRules = ['error',
    {selector: 'ForStatement', message: 'For statements can perform badly in migrations'},
    {selector: 'ForOfStatement', message: 'For statements can perform badly in migrations'},
    {selector: 'ForInStatement', message: 'For statements can perform badly in migrations'},
    {selector: 'WhileStatement', message: 'While statements can perform badly in migrations'},
    {selector: 'CallExpression[callee.property.name=\'forEach\']', message: 'Loop constructs like forEach can perform badly in migrations'},
    {selector: 'CallExpression[callee.object.name=\'_\'][callee.property.name=\'each\']', message: 'Loop constructs like _.each can perform badly in migrations'},
    {selector: 'CallExpression[callee.property.name=/join|innerJoin|leftJoin/] CallExpression[callee.property.name=/join|innerJoin|leftJoin/] CallExpression[callee.name=\'knex\']', message: 'Use of multiple join statements in a single knex block'}
];

export default tseslint.config(
    {
        ignores: [
            'core/frontend/src/**/*.js',
            'core/frontend/public/**/*.js',
            'core/built/**',
            'test/coverage/**',
            'test/utils/fixtures/themes/casper/assets/**',
            'test/utils/fixtures/themes/source/assets/**',
            // Allow-back: member-attribution is shipped to readers, but is the
            // one src/ subtree we DO lint.
            '!core/frontend/src/member-attribution/**/*.js'
        ]
    },
    {
        files: ['**/*'],
        ...strictLinterOptions
    },
    // ============================================================
    // Base: server / shared / frontend / root JS files
    // ============================================================
    {
        files: [
            'core/server/**/*.js',
            'core/shared/**/*.js',
            'core/frontend/**/*.js',
            'core/*.js',
            'bin/**/*.js',
            'scripts/**/*.js',
            '*.js'
        ],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: globals.node
        },
        plugins: {
            ghost: ghostPlugin,
            'local-filenames': localFilenamesPlugin
        },
        rules: {
            ...js.configs.recommended.rules,
            ...ghostBaseRules
        }
    },
    // ============================================================
    // TypeScript files
    // ============================================================
    {
        files: ['core/**/*.ts', '*.ts'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.node
        },
        plugins: {
            ghost: ghostPlugin,
            'local-filenames': localFilenamesPlugin
        },
        rules: {
            ...ghostBaseRules,
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                args: 'after-used',
                argsIgnorePattern: '^_',
                caughtErrors: 'none'
            }],
            'no-undef': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            ...tsLegacyRelaxations
        }
    },
    // ============================================================
    // TypeScript override block: must come AFTER tseslint extends to win.
    // ============================================================
    {
        files: ['core/**/*.ts', '*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            ...tsLegacyRelaxations
        }
    },
    // ============================================================
    // API endpoints
    // ============================================================
    {
        // Single-level glob is intentional. The rule guards the endpoint files
        // themselves (one per resource: posts.js, members.js, etc.); nested
        // endpoints/utils/ holds helpers that aren't endpoints and are
        // deliberately exempt from the complexity guard.
        files: ['core/server/api/endpoints/*'],
        rules: {
            'ghost/ghost-custom/max-api-complexity': 'error'
        }
    },
    // ============================================================
    // Migrations: enforce filename pattern (with ignoreExporting)
    // ============================================================
    {
        files: ['core/server/data/migrations/versions/**'],
        ignores: [
            'core/server/data/migrations/versions/1.*/*',
            'core/server/data/migrations/versions/2.*/*',
            'core/server/data/migrations/versions/3.*/*'
        ],
        plugins: {
            'local-filenames': localFilenamesPlugin
        },
        rules: {
            'local-filenames/match-regex': ['error', '^(?:\\d{4}(?:-\\d{2}){4,5}|\\d{2})(?:-[a-zA-Z0-9]+){2,}$', true]
        }
    },
    // ============================================================
    // Migrations: ban loops + return-in-loop
    // ============================================================
    {
        files: ['core/server/data/migrations/versions/**'],
        plugins: {ghost: ghostPlugin},
        rules: {
            'no-restricted-syntax': migrationLoopRules,
            'ghost/no-return-in-loop/no-return-in-loop': 'error'
        }
    },
    // ============================================================
    // schema.js: no created_by/updated_by columns
    // ============================================================
    {
        files: ['core/server/data/schema/schema.js'],
        rules: {
            'no-restricted-syntax': ['error',
                {selector: 'Property[key.name="created_by"]', message: '`created_by` is not allowed - The action log should be used to record user actions.'},
                {selector: 'Property[key.name="updated_by"]', message: '`updated_by` is not allowed - The action log should be used to record user actions.'}
            ]
        }
    },
    // ============================================================
    // Core filenames: kebab-case (with adapters carve-out)
    // ============================================================
    {
        files: ['core/**/*.{js,ts}'],
        ignores: ['core/server/adapters/**'],
        plugins: {
            'local-filenames': localFilenamesPlugin
        },
        rules: {
            'local-filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
        }
    },
    // ============================================================
    // Frontend helpers: filenames may use underscores
    // (e.g. ghost_head.js → {{ghost_head}})
    // ============================================================
    {
        files: ['core/frontend/helpers/**', 'core/frontend/apps/*/lib/helpers/**'],
        plugins: {
            'local-filenames': localFilenamesPlugin
        },
        rules: {
            'local-filenames/match-regex': ['error', '^[a-z0-9_.-]+$', false]
        }
    },
    // ============================================================
    // Browser-only admin-auth bridge scripts
    // ============================================================
    {
        files: ['core/frontend/src/admin-auth/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            'ghost/ghost-custom/no-native-error': 'off',
            'no-console': 'off'
        }
    },
    // ============================================================
    // member-attribution: the one frontend/src/ subtree shipped to readers
    // ============================================================
    {
        files: ['core/frontend/src/member-attribution/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    },
    // ============================================================
    // Test files
    // ============================================================
    {
        files: ['test/**/*.{js,ts}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.mocha,
                beforeAll: 'readonly',
                afterAll: 'readonly',
                should: 'readonly',
                sinon: 'readonly'
            }
        },
        plugins: {
            ghost: ghostPlugin,
            'local-filenames': localFilenamesPlugin
        },
        rules: {
            ...js.configs.recommended.rules,
            // Tests historically extended ghost/test (= base + test-rules).
            // Base rules come from correctnessRules (minus the ghost-filenames
            // rule we replace with local-filenames below); test-rules are the
            // workspace-specific extras after.
            ...correctnessRules,
            'ghost/filenames/match-regex': 'off',
            'no-unused-private-class-members': 'off',
            ...mochaRulesOffForGhost,
            'ghost/mocha/no-skipped-tests': 'error',
            camelcase: 'off',
            'no-prototype-builtins': 'off',
            'no-unused-vars': ['error', {
                varsIgnorePattern: '^should$',
                argsIgnorePattern: '^_',
                caughtErrors: 'none'
            }],
            'no-useless-escape': 'off',
            'local-filenames/match-regex': ['error', '^[a-z0-9-.]+$', false]
        }
    },
    {
        files: ['test/**/*.ts'],
        extends: [...tseslint.configs.recommended],
        rules: {
            'no-undef': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-inferrable-types': 'off'
        }
    },
    // Final TS relaxation — applies to every .ts in this workspace and must
    // come after every tseslint extends to win.
    {
        files: ['**/*.ts'],
        extends: [...tseslint.configs.recommended],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            ...tsLegacyRelaxations
        }
    },
    // Test files override — must come AFTER the final relaxation so the
    // tseslint recommended defaults that extends pulls in don't re-enable
    // no-unused-vars (test files have intentional unused imports for types).
    {
        files: ['test/**/*.ts'],
        extends: [...tseslint.configs.recommended],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            ...tsLegacyRelaxations
        }
    },
    // CLI scripts and build tools intentionally write to console — must come
    // after the base block so the no-console override wins.
    {
        files: ['bin/**/*.js', 'scripts/**/*.js'],
        rules: {'no-console': 'off'}
    }
);
