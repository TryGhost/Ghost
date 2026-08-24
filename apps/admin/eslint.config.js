import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import * as tseslint from 'typescript-eslint';
import { reactAppConfig } from '@internal/cfg-eslint-react';
import { shadeLayeredImportsRule } from '@internal/cfg-eslint';

// The factory's shade restriction and this file's boundary bans share the
// `no-restricted-imports` rule slot, so the boundary blocks must re-include it.
const shadeRestrictedPaths = shadeLayeredImportsRule['no-restricted-imports'][1].paths;

const emberBridgeImportPatterns = [
  {
    group: ['@/ember-bridge/ember-bridge', '**/ember-bridge/ember-bridge'],
    message: 'Import bridge helpers from the @/ember-bridge barrel, not the implementation module.',
  },
];

const noHardcodedGhostPaths = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded /ghost/ paths that break subdirectory installations',
    },
    messages: {
      noHardcodedPath:
        'Do not hardcode /ghost/ paths. Use getGhostPaths() from @tryghost/admin-x-framework/helpers to support subdirectory installations.',
    },
  },
  create(context) {
    const pattern = /^\/ghost\//;
    return {
      Literal(node) {
        if (typeof node.value === 'string' && pattern.test(node.value)) {
          context.report({ node, messageId: 'noHardcodedPath' });
        }
      },
      TemplateLiteral(node) {
        const first = node.quasis[0];
        if (first && pattern.test(first.value.raw)) {
          context.report({ node, messageId: 'noHardcodedPath' });
        }
      },
    };
  },
};

const localPlugin = {
  rules: {
    'no-hardcoded-ghost-paths': noHardcodedGhostPaths,
  },
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
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true, extraHOCs: ['withErrorBoundary'] },
      ],
    },
  }),
  // The factory is type-unaware; layer the type-checked rule set on top.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'no-relative-import-paths': noRelativeImportPaths },
    rules: {
      'no-relative-import-paths/no-relative-import-paths': [
        'error',
        { allowSameFolder: true, rootDir: 'src', prefix: '@' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.*'],
    plugins: { local: localPlugin },
    rules: {
      'local/no-hardcoded-ghost-paths': 'error',
    },
  },
  // Autofix can produce wrong paths for cross-directory imports here; use
  // @/* for src/ and @test-utils/* for test-utils/ manually.
  {
    files: ['test-utils/**/*.{ts,tsx}'],
    plugins: { 'no-relative-import-paths': noRelativeImportPaths },
    rules: {
      'no-relative-import-paths/no-relative-import-paths': ['error', { allowSameFolder: true }],
    },
  },
  // Boundary guardrails. Product code must reach react-router, the Ember
  // bridge, and the Admin API through their owning layers.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.*', 'src/ember-bridge/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...shadeRestrictedPaths,
            {
              name: 'react-router',
              message:
                'Import routing APIs (and their types) from @tryghost/admin-x-framework instead of react-router directly.',
            },
          ],
          patterns: emberBridgeImportPatterns,
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='EmberBridge']",
          message:
            'Access Ember through the @/ember-bridge helpers, not window.EmberBridge directly.',
        },
        {
          selector: "MemberExpression[property.value='EmberBridge']",
          message:
            'Access Ember through the @/ember-bridge helpers, not window.EmberBridge directly.',
        },
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            'Admin API requests belong in the @tryghost/admin-x-framework API layer. For non-Ghost URLs (external services, front-end previews), disable this rule for the line with a reason.',
        },
        {
          selector: "CallExpression[callee.object.name='window'][callee.property.name='fetch']",
          message:
            'Admin API requests belong in the @tryghost/admin-x-framework API layer. For non-Ghost URLs (external services, front-end previews), disable this rule for the line with a reason.',
        },
        {
          selector: "CallExpression[callee.object.name='globalThis'][callee.property.name='fetch']",
          message:
            'Admin API requests belong in the @tryghost/admin-x-framework API layer. For non-Ghost URLs (external services, front-end previews), disable this rule for the line with a reason.',
        },
      ],
    },
  },
  // Test files keep react-router scaffolding (MemoryRouter, createMemoryRouter)
  // and window.EmberBridge stubs, but must still import the bridge barrel.
  {
    files: ['src/**/*.test.*'],
    ignores: ['src/ember-bridge/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [...shadeRestrictedPaths], patterns: emberBridgeImportPatterns },
      ],
    },
  },
  // Advisory only — warnings do not fail CI (`eslint .` without --max-warnings).
  // Steers new code to the shade utilities without forcing a bulk conversion.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.*'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'warn',
        {
          paths: [
            { name: 'clsx', message: 'Use cn from @tryghost/shade/utils.' },
            {
              name: 'lucide-react',
              message: 'Use the LucideIcon namespace from @tryghost/shade/utils.',
            },
          ],
        },
      ],
    },
  },
);
