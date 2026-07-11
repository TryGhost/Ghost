import {reactAppConfig} from '@internal/cfg-eslint-react';

export default reactAppConfig({
    tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
    shadeRestricted: true,
    sortImports: true,
    extraTestRules: {
        // TODO: 7 legacy violations in test/ — mock-fixture typing shortcuts.
        '@typescript-eslint/no-explicit-any': 'off'
    }
});
