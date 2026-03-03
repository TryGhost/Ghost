import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'
import ghostPlugin from 'eslint-plugin-ghost';

const noHardcodedGhostPaths = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded /ghost/ paths that break subdirectory installations',
    },
    messages: {
      noHardcodedPath: 'Do not hardcode /ghost/ paths. Use getGhostPaths() from @tryghost/admin-x-framework/helpers to support subdirectory installations.',
    },
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
      },
    };
  },
};

const localPlugin = {
  rules: {
    'no-hardcoded-ghost-paths': noHardcodedGhostPaths,
  },
};

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    plugins: {
      'no-relative-import-paths': noRelativeImportPaths,
      ghost: ghostPlugin,
      local: localPlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false],
    },
  },
  // Apply no-relative-import-paths rule for src files (auto-fix supported)
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-relative-import-paths/no-relative-import-paths': [
        'error',
        { allowSameFolder: true, rootDir: 'src', prefix: '@' },
      ],
    },
  },
  // Prevent hardcoded /ghost/ paths in production code (not tests, where mocks need fixed paths)
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.*'],
    rules: {
      'local/no-hardcoded-ghost-paths': 'error',
    },
  },
  // Apply no-relative-import-paths rule for test-utils files
  // Note: auto-fix may produce incorrect paths for cross-directory imports
  // Use the correct alias manually: @/* for src/, @test-utils/* for test-utils/
  {
    files: ['test-utils/**/*.{ts,tsx}'],
    rules: {
      'no-relative-import-paths/no-relative-import-paths': [
        'error',
        { allowSameFolder: true },
      ],
    },
  },
])
