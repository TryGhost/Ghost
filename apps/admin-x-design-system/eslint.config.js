import {reactAppConfig} from '@internal/cfg-eslint-react';

export default reactAppConfig({
    tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
    ignores: ['dist/**/*', 'storybook-static/**/*'],
    storybook: 'storiesBlock'
});
