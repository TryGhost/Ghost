import {reactAppConfig} from '../../eslint.shared.mjs';

export default await reactAppConfig({
    shadeRestricted: true,
    extraTestRules: {
        // TODO: 71 legacy violations in test/ — mostly mock-fixture typing
        // shortcuts. Cleanup PR will type them properly and flip back.
        '@typescript-eslint/no-explicit-any': 'off'
    }
});
