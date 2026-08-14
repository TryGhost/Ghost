import {reactAppConfig} from '../../eslint.shared.mjs';

// Shade lints `scripts/` alongside `src/` (one-off build/codegen scripts).
export default await reactAppConfig({
    tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
    ignores: ['dist/**/*', 'storybook-static/**/*'],
    srcGlobs: ['src/**/*.{js,ts,cjs,tsx}', 'scripts/**/*.{js,ts,cjs,tsx}'],
    storybook: 'plugin'
});
