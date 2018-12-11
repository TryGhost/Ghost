export default function (config, env, helpers) {
    const postcssLoader = helpers.getLoadersByName(config, 'postcss-loader');
    const cssLoader = helpers.getLoadersByName(config, 'css-loader');
    postcssLoader.forEach(({ loader }) => (delete loader.options));
    cssLoader.forEach(({ loader }) => (delete loader.options));

    helpers.getRulesByMatchingFile(config, '*.css').forEach(({ rule }) => {
        let filter = (rule.include || rule.exclude || []);
        let newFilter = filter[0].replace('/components', '/styles');
        filter.push(newFilter);
    });

    if (env.production) {
        config.output.publicPath = 'static/';
    } else {
        config.output.publicPath = 'http://localhost:8080/';
    }
    config.devServer = {
        quiet: true,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
        }
    }
}
