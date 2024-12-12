const shadePreset = require('@tryghost/shade/tailwind.cjs');

module.exports = {
    presets: [shadePreset('.shade')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/shade/es/**/*.{js,ts,jsx,tsx}']
};
