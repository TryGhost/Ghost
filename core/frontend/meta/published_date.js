function getPublishedDate(data) {
    let context = data.context ? data.context[0] : null;

    //Since page is an extension of post
    context = context === 'amp' || context === 'page' ? 'post' : context;

    if (data[context] && data[context].published_at) {
        return new Date(data[context].published_at).toISOString();
    }
    return null;
}

module.exports = getPublishedDate;
