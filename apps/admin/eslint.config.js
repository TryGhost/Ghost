import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import * as tseslint from 'typescript-eslint';
import {reactAppConfig} from '@internal/cfg-eslint-react';

const noHardcodedGhostPaths = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow hardcoded /ghost/ paths that break subdirectory installations'
        },
        messages: {
            noHardcodedPath: 'Do not hardcode /ghost/ paths. Use getGhostPaths() from @tryghost/admin-x-framework/helpers to support subdirectory installations.'
        }
    },
    create(context) {
        const pattern = /^\/ghost\//;
        return {
            Literal(node) {
                if (typeof node.value === 'string' && pattern.test(node.value)) {
                    context.report({node, messageId: 'noHardcodedPath'});
                }
            },
            TemplateLiteral(node) {
                const first = node.quasis[0];
                if (first && pattern.test(first.value.raw)) {
                    context.report({node, messageId: 'noHardcodedPath'});
                }
            }
        };
    }
};

const localPlugin = {
    rules: {
        'no-hardcoded-ghost-paths': noHardcodedGhostPaths
    }
};

export default tseslint.config(
    ...reactAppConfig({
        tailwindCssPath: `${import.meta.dirname}/src/index.css`,
        shadeRestricted: true,
        ignores: ['dist/**/*', 'test-utils/acceptance/public/**/*'],
        // One uniform block: src, test-utils, and the root vite/vitest configs
        // all get the same rules (matching this workspace's historical setup).
        srcGlobs: ['**/*.{ts,tsx}'],
        testGlobs: false,
        extraSrcRules: {
            // The factory disables this (legacy violations elsewhere); this
            // workspace is clean, so keep enforcing it.
            'react-refresh/only-export-components': ['error', {allowConstantExport: true, extraHOCs: ['withErrorBoundary']}]
        }
    }),
    // The factory is type-unaware; layer the type-checked rule set on top.
    {
        files: ['**/*.{ts,tsx}'],
        extends: [...tseslint.configs.recommendedTypeCheckedOnly],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        }
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: {'no-relative-import-paths': noRelativeImportPaths},
        rules: {
            'no-relative-import-paths/no-relative-import-paths': [
                'error',
                {allowSameFolder: true, rootDir: 'src', prefix: '@'}
            ]
        }
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['src/**/*.test.*'],
        plugins: {local: localPlugin},
        rules: {
            'local/no-hardcoded-ghost-paths': 'error'
        }
    },
    // Autofix can produce wrong paths for cross-directory imports here; use
    // @/* for src/ and @test-utils/* for test-utils/ manually.
    {
        files: ['test-utils/**/*.{ts,tsx}'],
        plugins: {'no-relative-import-paths': noRelativeImportPaths},
        rules: {
            'no-relative-import-paths/no-relative-import-paths': [
                'error',
                {allowSameFolder: true}
            ]
        }
    }
);
