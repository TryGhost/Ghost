import {reactAppConfig} from '../../eslint.shared.mjs';

export default await reactAppConfig({
    tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
    shadeRestricted: true,
    sortImports: true
});
