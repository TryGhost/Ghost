const adminXPreset = require('@tryghost/shade/tailwind.cjs');

module.exports = {
    presets: [adminXPreset('.post-analytics-spike')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/shade/es/**/*.{js,ts,jsx,tsx}']
};
