import adminXPreset from '@tryghost/admin-x-design/tailwind.cjs';

export default {
    presets: [adminXPreset('.admin-x-settings')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/admin-x-design/es/**/*.{js,ts,jsx,tsx}']
};
