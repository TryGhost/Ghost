import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'
import ghostPlugin from 'eslint-plugin-ghost';

// Patch the filenames/match-regex rule to add schema for ESLint 9 compatibility
// TODO: Remove once eslint-plugin-ghost is updated
const matchRegexRule = ghostPlugin.rules['filenames/match-regex'];
ghostPlugin.rules['filenames/match-regex'] = {
  create: matchRegexRule,
  meta: {
    schema: [
      { type: 'string' },
      { type: 'boolean' },
      { type: 'boolean' }
    ]
  }
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
