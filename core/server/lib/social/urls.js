module.exports.twitter = function twitter(username) {
    // Creates the canonical twitter URL without the '@'
    return 'https://twitter.com/' + username.replace(/^@/, '');
};

module.exports.facebook = function facebook(username) {
    // Handles a starting slash, this shouldn't happen, but just in case
    return 'https://www.facebook.com/' + username.replace(/^\//, '');
};
