import {reactAppConfig} from '@internal/cfg-eslint-react';

export default reactAppConfig({
    shadeRestricted: true,
    extraTestRules: {
        // TODO: 71 legacy violations in test/ — mostly mock-fixture typing
        // shortcuts. Cleanup PR will type them properly and flip back.
        '@typescript-eslint/no-explicit-any': 'off'
    }
});
