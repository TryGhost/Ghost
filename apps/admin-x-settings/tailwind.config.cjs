/* eslint-disable @typescript-eslint/no-require-imports */
const designSystemTailwindConfig = require('../admin-x-design-system/tailwind.config.cjs');
const designSystemPreset = {...designSystemTailwindConfig};
delete designSystemPreset.content;

module.exports = {
    presets: [{
        ...designSystemPreset,
        important: '.admin-x-settings'
    }],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/admin-x-design-system/es/**/*.{js,ts,jsx,tsx}']
};
