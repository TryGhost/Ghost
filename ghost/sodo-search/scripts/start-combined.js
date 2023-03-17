const rewire = require('rewire');
const defaults = rewire('react-scripts/scripts/start.js');
let configFactory = defaults.__get__('configFactory');

defaults.__set__('configFactory', (env) => {
    const config = configFactory(env);
    config.optimization.splitChunks = {
        cacheGroups: {
            default: false
        }
    };
    config.optimization.runtimeChunk = false;
    return config;
});
