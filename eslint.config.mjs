import globals from 'globals';

// Workspace-wide root config. Each workspace has its own eslint.config.mjs;
// this file only handles files that fall outside any workspace, mainly the
// scripts/ directory invoked via lint-staged when files there are touched.
export default [
    {
        files: ['scripts/**/*.{js,cjs,mjs}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: globals.node
        }
    }
];
