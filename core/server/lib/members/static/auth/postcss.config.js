module.exports = {
    plugins: [
        require('postcss-import'),
        require('autoprefixer'),
        require('postcss-css-variables'),
        require('postcss-color-mod-function'),
        require('cssnano'),
        require('postcss-custom-properties')
    ]
};
