import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

import {
    correctnessRules,
    mochaRulesOff,
    reactDefaultsOff,
    reactStrictRules,
    tsUnusedVarsRule
} from '../../eslint.shared.mjs';

// Framework-specific boundary: shade must be imported via layered subpaths,
// and the framework must not depend on a design system at all. The DS rule is
// the architectural seam — invert via FrameworkProvider instead.
const frameworkBoundaryRule = {
    'no-restricted-imports': ['error', {
        paths: [{
            name: '@tryghost/shade',
            message: 'Import from layered subpaths instead (components/primitives/patterns/utils/app/tokens).'
        }, {
            name: '@tryghost/admin-x-design-system',
            message: 'Framework must not depend on a design system. Inline the type, relocate the logic, or invert the dependency via FrameworkProvider.'
        }]
    }]
};

// Files still bleeding DS while their runtime inversion is in flight. Each
// entry is a TODO: remove the file from this list once the inversion lands.
// - use-handle-error.ts: removes showToast when FrameworkProvider gains a
//   notifyError injection (next PR).
const frameworkBoundaryAllowlist = {
    'no-restricted-imports': ['error', {
        paths: [{
            name: '@tryghost/shade',
            message: 'Import from layered subpaths instead (components/primitives/patterns/utils/app/tokens).'
        }]
    }]
};

const reactFlat = reactPlugin.configs.flat.recommended;

export default tseslint.config(
    {
        ignores: ['dist/**/*']
    },
    {
        files: ['src/**/*.{js,ts,cjs,tsx}'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            ...reactFlat.languageOptions,
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        plugins: {
            ...reactFlat.plugins,
            ghost: ghostPlugin,
            'react-hooks': reactHooksPlugin,
            'react-refresh': reactRefreshPlugin
        },
        settings: {
            react: {version: 'detect'}
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactFlat.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            ...correctnessRules,
            ...tsUnusedVarsRule,
            ...reactDefaultsOff,
            ...reactStrictRules,
            ...frameworkBoundaryRule,
            // TS handles these — disable the base ESLint variants
            'no-undef': 'off',
            'no-redeclare': 'off',
            'no-unexpected-multiline': 'off',
            '@typescript-eslint/no-inferrable-types': 'off'
        }
    },
    {
        files: ['src/hooks/use-handle-error.ts'],
        rules: frameworkBoundaryAllowlist
    },
    {
        files: ['test/**/*.{js,ts,cjs,tsx}'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.vitest,
                vi: 'readonly'
            }
        },
        plugins: {
            ghost: ghostPlugin
        },
        rules: {
            ...correctnessRules,
            ...tsUnusedVarsRule,
            ...mochaRulesOff(ghostPlugin),
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
);
