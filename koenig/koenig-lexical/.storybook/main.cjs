const svgrPlugin = require('vite-plugin-svgr');

module.exports = {
  async viteFinal(config, { configType }) {
    // use Node import() because storybook config doesn't support ES modules
    const envModule = await import('../config/setLocalEnv.js');
    envModule.setLocalEnv();

    config.plugins = [
      ...config.plugins,
      svgrPlugin({
        svgrOptions: {
          icon: true,
        },
      })
    ];

    config.optimizeDeps = {
        include: ['@tryghost/kg-markdown-html-renderer', '@tryghost/kg-simplemde']
    };

    config.build = {commonjsOptions: {
            include: [/packages/],
    }};
    return config;
  },
  "stories": [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@etchteam/storybook-addon-status"
  ],
  "framework": "@storybook/react",
  "core": {
    "builder": "@storybook/builder-vite"
  },
  "features": {
    "storyStoreV7": true
  }
};
