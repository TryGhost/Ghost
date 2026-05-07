import path from 'path';
import {createVitestConfig} from '@tryghost/admin-x-framework/test/vitest-config';

export default createVitestConfig({
    aliases: {
        '@assets': path.resolve(__dirname, './src/assets'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@views': path.resolve(__dirname, './src/views')
    }
});
