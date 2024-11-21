const adminXPreset = require('@tryghost/phantom/tailwind.cjs');

module.exports = {
    presets: [adminXPreset('.post-analytics-spike')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/phantom/es/**/*.{js,ts,jsx,tsx}']
};
