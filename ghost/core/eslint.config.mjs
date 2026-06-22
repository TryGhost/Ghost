import path from 'node:path';
import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import tseslint from 'typescript-eslint';

const __dirname = import.meta.dirname;

// eslint-plugin-filenames-ts@1.3.2's match-regex calls context.getScope(),
// which ESLint 9 removed. Replace it with a minimal equivalent that does
// the filename check (+ ignoreExporting via AST scan, no scope traversal).
const filenamesMatchRegex = {
    meta: {
        type: 'problem',
        schema: [
            {type: 'string'},
            {type: ['boolean', 'null']},
            {type: ['boolean', 'null']}
        ]
    },
    create(context) {
        const pattern = new RegExp(context.options[0]);
        const ignoreExporting = Boolean(context.options[1]);
        return {
            Program(node) {
                if (ignoreExporting) {
                    const hasExport = node.body.some(stmt =>
                        stmt.type === 'ExportDefaultDeclaration' ||
                        stmt.type === 'ExportNamedDeclaration' ||
                        (stmt.type === 'ExpressionStatement' &&
                         stmt.expression.type === 'AssignmentExpression' &&
                         stmt.expression.left.type === 'MemberExpression' &&
                         stmt.expression.left.object.type === 'Identifier' &&
                         stmt.expression.left.object.name === 'module' &&
                         stmt.expression.left.property.type === 'Identifier' &&
                         stmt.expression.left.property.name === 'exports')
                    );
                    if (hasExport) return;
                }
                const filename = path.parse(context.filename).name;
                if (!pattern.test(filename)) {
                    context.report({
                        node,
                        message: `Filename '${filename}' does not match the naming convention.`
                    });
                }
            }
        };
    }
};

const localFilenamesPlugin = {
    rules: {'match-regex': filenamesMatchRegex}
};

const ghostBaseRules = {
    curly: 'error',
    camelcase: ['error', {properties: 'never'}],
    'dot-notation': 'error',
    eqeqeq: ['error', 'always'],
    'no-plusplus': ['error', {allowForLoopAfterthoughts: true}],
    'no-eval': 'error',
    'no-useless-call': 'error',
    'no-console': 'error',
    'no-shadow': 'error',
    'array-callback-return': 'error',
    'no-constructor-return': 'error',
    'no-promise-executor-return': 'error',
    'no-unused-vars': ['error', {caughtErrors: 'none'}],
    // ESLint 9 added this to eslint:recommended; the codebase has intentional
    // placeholder private fields and was not previously linted for them.
    'no-unused-private-class-members': 'off',
    'no-var': 'error',
    'one-var': ['error', 'never'],
    'ghost/ghost-custom/no-native-error': 'error',
    'ghost/ghost-custom/ghost-error-usage': 'error',
    'ghost/ghost-custom/ghost-tpl-usage': 'error'
};

const mochaRulesOff = Object.fromEntries(
    Object.keys(ghostPlugin.rules || {})
        .filter(rule => rule.startsWith('mocha/'))
        .map(rule => [`ghost/${rule}`, 'off'])
);

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
    // ============================================================
    // Base: server / shared / frontend / root JS files
    // ============================================================
    {
        files: [
            'core/server/**/*.js',
            'core/shared/**/*.js',
            'core/frontend/**/*.js',
            'core/*.js',
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
            // typescript-eslint v8's recommended is stricter than what the
            // legacy ghost/ts config enforced. Match the previous posture
            // until a separate cleanup pass tightens them.
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            'prefer-const': 'off'
        }
    },
    // ============================================================
    // TypeScript override block: relax tseslint v8 recommended back to
    // the posture the legacy plugin:ghost/ts enforced. Must come AFTER the
    // tseslint extends to win.
    // ============================================================
    {
        files: ['core/**/*.ts', '*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            'prefer-const': 'off'
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
    // shared/ must not require server/* or frontend/*
    // ============================================================
    {
        files: ['core/shared/**'],
        plugins: {ghost: ghostPlugin},
        rules: {
            'ghost/node/no-restricted-require': ['error', [
                {name: path.resolve(__dirname, 'core/server/**'), message: 'Invalid require of core/server from core/shared.'},
                {name: path.resolve(__dirname, 'core/frontend/**'), message: 'Invalid require of core/frontend from core/shared.'}
            ]]
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
    // Frontend must not require server/models directly
    // ============================================================
    {
        files: ['core/frontend/**'],
        plugins: {ghost: ghostPlugin},
        rules: {
            'ghost/node/no-restricted-require': ['error', [
                {
                    name: [path.resolve(__dirname, 'core/server/models/**')],
                    message: 'Invalid require of core/server/models from core/frontend. Fetch content through the public Content API (api.postsPublic / api.pagesPublic), injected via core/frontend/services/proxy — not the model layer directly. See #28420.'
                }
            ]]
        }
    },
    // ============================================================
    // Frontend must cross to server only via proxy (with allowlist)
    // ============================================================
    {
        files: ['core/frontend/**'],
        ignores: [
            'core/frontend/services/proxy.js',
            'core/frontend/web/site.js',
            'core/frontend/web/middleware/frontend-caching.js',
            'core/frontend/web/middleware/handle-image-sizes.js',
            'core/frontend/web/routers/link-redirects.js',
            'core/frontend/web/routers/serve-favicon.js',
            'core/frontend/apps/private-blogging/lib/router.js',
            'core/frontend/services/routing/controllers/unsubscribe.js',
            'core/frontend/services/routing/router-manager.js',
            'core/frontend/services/sitemap/site-map-manager.js'
        ],
        plugins: {ghost: ghostPlugin},
        rules: {
            'ghost/node/no-restricted-require': ['error', [
                {
                    name: [path.resolve(__dirname, 'core/server/**')],
                    message: 'Invalid require of core/server from core/frontend. Cross only via the proxy seam (core/frontend/services/proxy.js).'
                }
            ]]
        }
    },
    // ============================================================
    // Server must not require frontend (with allowlist)
    // ============================================================
    {
        files: ['core/server/**'],
        ignores: [
            'core/server/web/parent/frontend.js',
            'core/server/services/route-settings/validate.js'
        ],
        plugins: {ghost: ghostPlugin},
        rules: {
            'ghost/node/no-restricted-require': ['error', [
                {
                    name: [path.resolve(__dirname, 'core/frontend/**')],
                    message: 'Invalid require of core/frontend from core/server. The server must not depend on the frontend rendering layer.'
                }
            ]]
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
            // Re-applying only the rules that the legacy config actually had:
            curly: 'error',
            'dot-notation': 'error',
            eqeqeq: ['error', 'always'],
            'no-plusplus': ['error', {allowForLoopAfterthoughts: true}],
            'no-eval': 'error',
            'no-useless-call': 'error',
            'no-console': 'error',
            'array-callback-return': 'error',
            'no-constructor-return': 'error',
            'no-promise-executor-return': 'error',
            'no-unused-private-class-members': 'off',
            ...mochaRulesOff,
            'ghost/mocha/no-skipped-tests': 'error',
            'no-shadow': 'error',
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
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            'prefer-const': 'off'
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
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            'prefer-const': 'off'
        }
    }
);
