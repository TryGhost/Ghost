module.exports = {
    plugins: [
        require('autoprefixer'),
        require('postcss-css-variables'),
        require('postcss-color-mod-function'),
        require('cssnano'),
        require('postcss-custom-properties')
    ]
};
