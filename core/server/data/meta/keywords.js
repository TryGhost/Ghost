function getKeywords(data) {
    if (data.post && data.post.tags && data.post.tags.length > 0) {
        return data.post.tags.map(function (tag) {
            return tag.name;
        });
    }
    return null;
}

module.exports = getKeywords;
