import {nodeLibConfig} from '@internal/cfg-eslint';

export default nodeLibConfig({
    // Tests fabricate native Errors to exercise error propagation; @tryghost/errors
    // is a source-code concern and this standalone package doesn't depend on it.
    extraTestRules: {
        'ghost/ghost-custom/no-native-error': 'off'
    }
});
