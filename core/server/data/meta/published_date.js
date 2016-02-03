function getPublishedDate(data) {
    var context = data.context ? data.context[0] : null,
        pubDate;
    if (data[context]) {
        pubDate = data[context].published_at || data[context].created_at || null;
        if (pubDate) {
            return new Date(pubDate).toISOString();
        }
    }
    return null;
}

module.exports = getPublishedDate;
