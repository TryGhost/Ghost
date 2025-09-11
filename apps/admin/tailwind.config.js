import shadePreset from '@tryghost/shade/tailwind.cjs';

export default {
    presets: [shadePreset('.shade-posts')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/shade/es/**/*.{js,ts,jsx,tsx}']
};