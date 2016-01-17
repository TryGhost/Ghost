function getOgType(data) {
    var context = data.context ? data.context[0] : null;
    if (context === 'author') {
        return 'profile';
    }
    if (context === 'post') {
        return 'article';
    }
    return 'website';
}

module.exports = getOgType;
