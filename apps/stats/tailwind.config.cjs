const shadePreset = require('@tryghost/shade/tailwind.cjs');

module.exports = {
    presets: [shadePreset('.shade')],
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
        '../../node_modules/@tryghost/shade/es/**/*.{js,ts,jsx,tsx}',

        // We need to scan all apps that use shade to force Tailwind build all used classes
        '../posts/src/**/*.{js,ts,jsx,tsx}',
        '../stats/src/**/*.{js,ts,jsx,tsx}',
        '../admin-x-activitypub/src/**/*.{js,ts,jsx,tsx}'
    ]
};
