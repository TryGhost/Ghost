const path = require('path');
const glob = require('glob');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        'bundle.js': glob.sync('build/static/?(js|css)/main.*.?(js|css)').map(f => path.resolve(__dirname, f))
    },
    output: {
        filename: 'sodo-search.min.js',
        path: __dirname + '/umd'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {from: './build/static/js/main.js.map', to: './umd/sodo-search.min.js.map'}
            ]
        })
    ],
    performance: {
        hints: false,
        maxEntrypointSize: 560,
        maxAssetSize: 5600
    }
};
