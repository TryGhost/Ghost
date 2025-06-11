const isUnsplashImage = function (url) {
    return /images\.unsplash\.com/.test(url);
};

module.exports = {
    isUnsplashImage
};
