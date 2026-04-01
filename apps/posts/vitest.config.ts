import path from 'path';
import {createVitestConfig} from '@tryghost/admin-x-framework/test/vitest-config';

export default createVitestConfig({
    aliases: {
        '@assets': path.resolve(process.cwd(), './src/assets'),
        '@components': path.resolve(process.cwd(), './src/components'),
        '@hooks': path.resolve(process.cwd(), './src/hooks'),
        '@utils': path.resolve(process.cwd(), './src/utils'),
        '@views': path.resolve(process.cwd(), './src/views')
    }
});
