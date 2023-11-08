const adminXPreset = require('@tryghost/admin-x-design/tailwind.cjs');

module.exports = {
    presets: [adminXPreset('.admin-x-settings')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/admin-x-design/es/**/*.{js,ts,jsx,tsx}']
};
