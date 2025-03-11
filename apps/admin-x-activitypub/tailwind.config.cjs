const adminXPreset = require('@tryghost/shade/tailwind.cjs');

module.exports = {
    presets: [adminXPreset('.shade')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/admin-x-design-system/es/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/shade/es/**/*.{js,ts,jsx,tsx}']
};