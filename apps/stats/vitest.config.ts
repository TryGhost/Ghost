import {createVitestConfig} from '@tryghost/admin-x-framework/test/vitest-config';
import {resolve} from 'path';

export default createVitestConfig({
    aliases: {
        '@src': resolve(__dirname, './src'),
        '@assets': resolve(__dirname, './src/assets'),
        '@components': resolve(__dirname, './src/components'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@utils': resolve(__dirname, './src/utils'),
        '@views': resolve(__dirname, './src/views')
    }
});
