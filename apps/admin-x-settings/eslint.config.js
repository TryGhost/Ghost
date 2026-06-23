import {reactAppConfig} from '../../eslint.shared.mjs';

export default await reactAppConfig({
    tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
    shadeRestricted: true,
    extraSrcRules: {
        // TODO: 43 legacy violations. Remove this override after the cleanup PR
        // converts all `let` → `const` where reassignment never happens.
        'prefer-const': 'off',
        // TODO: 2 legacy violations. Easy to fix — drop this override and type
        // the two remaining `any` usages (in design-and-branding + utils).
        '@typescript-eslint/no-explicit-any': 'off'
    },
    extraTestRules: {
        // TODO: 7 legacy violations in test/ — mock-fixture typing shortcuts.
        '@typescript-eslint/no-explicit-any': 'off'
    }
});
