import {nodeLibConfig} from '@internal/cfg-eslint';

export default nodeLibConfig({
    // The shared contract test suite is authored in src/ (it is a package export)
    // but it uses vitest globals; treat it like test code for lint purposes.
    extraTestRules: {
        'ghost/ghost-custom/no-native-error': 'off'
    }
});
