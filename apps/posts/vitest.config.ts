import path from 'path';
import {createVitestConfig} from '@tryghost/admin-x-framework/test/vitest-config';

export default createVitestConfig({
    aliases: {
        '@components': path.resolve(process.cwd(), './src/components')
    }
});
