import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import playwrightPlugin from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'

const resetEnvironmentStaleFixtures = ['baseURL', 'ghostAccountOwner', 'page', 'pageWithAuthenticatedUser'];

function isBeforeEachHookCall(node) {
    if (node.type !== 'CallExpression') {
        return false;
    }

    if (node.callee.type === 'Identifier') {
        return node.callee.name === 'beforeEach';
    }

    return node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'beforeEach';
}

function isFunctionNode(node) {
    return node.type === 'ArrowFunctionExpression' ||
        node.type === 'FunctionExpression' ||
        node.type === 'FunctionDeclaration';
}

function getDestructuredFixtureNames(functionNode) {
    const [firstParam] = functionNode.params;
    if (!firstParam || firstParam.type !== 'ObjectPattern') {
        return new Set();
    }

    const fixtureNames = new Set();
    for (const property of firstParam.properties) {
        if (property.type !== 'Property') {
            continue;
        }

        if (property.key.type === 'Identifier') {
            fixtureNames.add(property.key.name);
        }
    }

    return fixtureNames;
}

const noUnsafeResetEnvironment = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Restrict resetEnvironment() to supported beforeEach hooks'
        },
        messages: {
            invalidLocation: 'resetEnvironment() is only supported inside beforeEach hooks. Use a beforeEach hook or switch the file to usePerTestIsolation().',
            invalidFixtures: 'Do not resolve {{fixtures}} in the same beforeEach hook as resetEnvironment(); those fixtures become stale after a recycle.'
        }
    },
    create(context) {
        return {
            CallExpression(node) {
                if (isBeforeEachHookCall(node)) {
                    const callback = node.arguments.find(argument => isFunctionNode(argument));
                    if (!callback) {
                        return;
                    }

                    const fixtureNames = getDestructuredFixtureNames(callback);
                    if (!fixtureNames.has('resetEnvironment')) {
                        return;
                    }

                    const staleFixtures = resetEnvironmentStaleFixtures.filter(fixtureName => fixtureNames.has(fixtureName));
                    if (staleFixtures.length > 0) {
                        context.report({
                            node: callback,
                            messageId: 'invalidFixtures',
                            data: {
                                fixtures: staleFixtures.map(fixtureName => `"${fixtureName}"`).join(', ')
                            }
                        });
                    }

                    return;
                }

                if (node.callee.type !== 'Identifier' || node.callee.name !== 'resetEnvironment') {
                    return;
                }

                const ancestors = context.sourceCode.getAncestors(node);
                const enclosingBeforeEachHook = [...ancestors]
                    .reverse()
                    .find((ancestor) => isFunctionNode(ancestor) &&
                        ancestor.parent &&
                        isBeforeEachHookCall(ancestor.parent));

                if (!enclosingBeforeEachHook) {
                    context.report({
                        node,
                        messageId: 'invalidLocation'
                    });
                }
            }
        };
    }
};

const localPlugin = {
    rules: {
        'no-unsafe-reset-environment': noUnsafeResetEnvironment
    }
};

export default tseslint.config([
    // Ignore patterns
    {
        ignores: [
            'build/**',
            'data/**',
            'playwright/**',
            'playwright-report/**',
            'test-results/**'
        ]
    },

    // Base config for all TypeScript files
    {
        files: ['**/*.ts', '**/*.mjs'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended
        ],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module'
            }
        },
        plugins: {
            ghost: ghostPlugin,
            playwright: playwrightPlugin,
            'no-relative-import-paths': noRelativeImportPaths,
            local: localPlugin,
        },
        rules: {
            // Manually include rules from plugin:ghost/ts and plugin:ghost/ts-test
            // These would normally come from the extends, but flat config requires explicit inclusion
            ...ghostPlugin.configs.ts.rules,

            // Sort multiple import lines into alphabetical groups
            'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
                memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
            }],

            // Enforce kebab-case (lowercase with hyphens) for all filenames
            'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false],

            // Apply no-relative-import-paths rule
            'no-relative-import-paths/no-relative-import-paths': [
                'error',
                { allowSameFolder: true, rootDir: './', prefix: '@' },
            ],

            // Restrict imports to specific directories
            'no-restricted-imports': ['error', {
                patterns: ['@/helpers/pages/*']
            }],

            // Disable all mocha rules from ghost plugin since this package uses playwright instead
            ...Object.fromEntries(
                Object.keys(ghostPlugin.rules || {})
                    .filter(rule => rule.startsWith('mocha/'))
                    .map(rule => [`ghost/${rule}`, 'off'])
            )
        }
    },

    // Keep assertions in test files and Playwright-specific helpers.
    {
        files: ['**/*.ts', '**/*.mjs'],
        ignores: [
            'tests/**/*.ts',
            'helpers/playwright/**/*.ts',
            'visual-regression/**/*.ts'
        ],
        rules: {
            'no-restricted-syntax': ['error',
                {
                    selector: "ImportSpecifier[imported.name='expect'][parent.source.value='@playwright/test']",
                    message: 'Keep Playwright expect assertions in test files.'
                },
                {
                    selector: "ImportSpecifier[imported.name='expect'][parent.source.value='@/helpers/playwright']",
                    message: 'Keep Playwright expect assertions in test files.'
                }
            ]
        }
    },

    // Playwright-specific recommended rules config for test files
    {
        files: ['tests/**/*.ts', 'helpers/playwright/**/*.ts', 'helpers/pages/**/*.ts'],
        rules: {
            ...playwrightPlugin.configs.recommended.rules,
            'playwright/expect-expect': ['warn', {
                assertFunctionPatterns: ['^expect[A-Z].*']
            }]
        }
    },

    // Keep test files on page objects and the supported isolation APIs.
    {
        files: ['tests/**/*.ts'],
        rules: {
            'local/no-unsafe-reset-environment': 'error',
            'no-restricted-syntax': ['error',
                {
                    selector: "CallExpression[callee.object.name='page'][callee.property.name='locator']",
                    message: 'Use page objects or higher-level page methods instead of page.locator() in test files.'
                },
                {
                    selector: 'MemberExpression[object.property.name="describe"][property.name="parallel"]',
                    message: 'test.describe.parallel() is deprecated. Use usePerTestIsolation() from @/helpers/playwright/isolation instead.'
                },
                {
                    selector: 'MemberExpression[object.property.name="describe"][property.name="serial"]',
                    message: 'test.describe.serial() is deprecated. Use test.describe.configure({mode: "serial"}) if needed.'
                }
            ]
        }
    }
]);
