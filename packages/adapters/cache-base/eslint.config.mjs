import {nodeLibConfig} from '@internal/cfg-eslint';

export default nodeLibConfig({
    typescript: false,
    commonjs: true,
    extraTestRules: {
        'ghost/ghost-custom/node-assert-strict': 'error'
    }
});
