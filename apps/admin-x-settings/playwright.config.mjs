import { adminXPlaywrightConfig } from '@tryghost/admin-x-framework/playwright';

export default adminXPlaywrightConfig({
    reporter: [
        ['html', { host: '0.0.0.0', port: 9323 }],
    ]
});
