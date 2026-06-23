import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

import {
    mochaRulesOff,
    shadeLayeredImportsRule,
    strictLinterOptions,
    tailwindRulesV4,
    tsReactAppRules,
    viteTsReactExtras
} from '../../eslint.shared.mjs';

const tailwindCssConfig = `${import.meta.dirname}/../admin/src/index.css`;

const reactFlat = reactPlugin.configs.flat.recommended;

export default tseslint.config(
    {
        ignores: ['dist/**/*']
    },
    {
        files: ['**/*'],
        ...strictLinterOptions
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
            'react-refresh': reactRefreshPlugin,
            tailwindcss: tailwindcssPlugin
        },
        settings: {
            react: {version: 'detect'},
            tailwindcss: {config: tailwindCssConfig}
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactFlat.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            ...tsReactAppRules,
            ...viteTsReactExtras,
            ...shadeLayeredImportsRule,
            ...tailwindRulesV4,
            // Legacy violations not yet cleaned up. Tracked for follow-up.
            'prefer-const': 'off',                       // 43 violations
            '@typescript-eslint/no-explicit-any': 'off'  // 2 violations
        }
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
            ...tsReactAppRules,
            ...mochaRulesOff(ghostPlugin)
        }
    }
);
