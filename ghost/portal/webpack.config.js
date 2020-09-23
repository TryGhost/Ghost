const path = require('path');
const glob = require('glob');

module.exports = {
    entry: {
        'bundle.js': glob.sync('build/static/?(js|css)/main.*.?(js|css)').map(f => path.resolve(__dirname, f))
    },
    output: {
        filename: 'portal.min.js',
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
    plugins: []
};