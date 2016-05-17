module.exports.twitterUrl = function twitterUrl(username) {
    // Creates the canonical twitter URL without the '@'
    return 'https://twitter.com/' + username.replace(/^@/, '');
};

module.exports.facebookUrl = function facebookUrl(username) {
    // Handles a starting slash, this shouldn't happen, but just in case
    return 'https://www.facebook.com/' + username.replace(/^\//, '');
};
