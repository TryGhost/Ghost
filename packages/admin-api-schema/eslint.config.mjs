import {nodeLibConfig} from '@internal/cfg-eslint';

export default nodeLibConfig({
    commonjs: true,
    srcGlobs: ['index.js', 'src/**/*.ts'],
    extraSrcRules: {
        '@typescript-eslint/no-require-imports': 'off'
    },
    extraTestRules: {
        '@typescript-eslint/no-require-imports': 'off',
        'no-redeclare': 'off',
        'ghost/ghost-custom/node-assert-strict': 'error'
    }
});
