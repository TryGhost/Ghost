const shadePreset = require('@tryghost/shade/tailwind.cjs');
const sharedContent = require('@tryghost/shade/shared-content.cjs');

module.exports = {
    presets: [shadePreset('.shade')],
    content: sharedContent.getAllContent([
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}'
    ])
};
