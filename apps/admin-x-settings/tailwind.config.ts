import adminXPreset from './src/admin-x-ds/tailwind';
import {Config} from 'tailwindcss';

export default {
    presets: [adminXPreset('.admin-x-settings')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']
} satisfies Config;
