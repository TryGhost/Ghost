import shadePreset from '@tryghost/shade/tailwind.cjs';
import sharedContent from '@tryghost/shade/shared-content.cjs';

module.exports = {
    presets: [shadePreset('.shade')],
    content: sharedContent.getAllContent([
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}'
    ])
};