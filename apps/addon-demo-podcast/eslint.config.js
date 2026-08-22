import {reactAppConfig} from '@internal/cfg-eslint-react';

export default reactAppConfig({
    reactRefresh: false,
    srcGlobs: ['src/**/*.{ts,tsx}', 'server.mts']
});
