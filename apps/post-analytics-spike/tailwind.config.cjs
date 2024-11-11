const adminXPreset = require('@tryghost/admin-x-design-system/tailwind.cjs');

module.exports = {
    presets: [adminXPreset('.post-analytics-spike')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/admin-x-design-system/es/**/*.{js,ts,jsx,tsx}']
};
