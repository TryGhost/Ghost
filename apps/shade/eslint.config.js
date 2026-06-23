import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import storybookPlugin from 'eslint-plugin-storybook';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

import {
    mochaRulesOff,
    strictLinterOptions,
    tailwindRulesV4,
    tsReactAppRules,
    viteTsReactExtras
} from '../../eslint.shared.mjs';

const tailwindCssConfig = `${import.meta.dirname}/../admin/src/index.css`;

const reactFlat = reactPlugin.configs.flat.recommended;

export default tseslint.config(
    {
        ignores: ['dist/**/*', 'storybook-static/**/*']
    },
    {
        files: ['**/*'],
        ...strictLinterOptions
    },
    {
        files: ['src/**/*.{js,ts,cjs,tsx}', 'scripts/**/*.{js,ts,cjs,tsx}'],
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
            ...tailwindRulesV4
        }
    },
    ...storybookPlugin.configs['flat/recommended'],
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
