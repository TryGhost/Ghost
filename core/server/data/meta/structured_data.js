function getStructuredData(metaData) {
    var structuredData,
        card = 'summary',
        twitterCreator,
        twitterSite;

    if (metaData.coverImage) {
        card = 'summary_large_image';
    }

    if (metaData.creatorTwitter) {
        twitterCreator = '@' + metaData.creatorTwitter.match(/(?:https:\/\/)(?:twitter\.com)\/(?:#!\/)?@?([^\/]*)/)[1];
    }

    if (metaData.blog.twitter) {
        twitterSite = '@' + metaData.blog.twitter.match(/(?:https:\/\/)(?:twitter\.com)\/(?:#!\/)?@?([^\/]*)/)[1];
    }

    structuredData = {
        'og:site_name': metaData.blog.title,
        'og:type': metaData.ogType,
        'og:title': metaData.metaTitle,
        'og:description': metaData.metaDescription || metaData.excerpt,
        'og:url': metaData.canonicalUrl,
        'og:image': metaData.coverImage,
        'article:published_time': metaData.publishedDate,
        'article:modified_time': metaData.modifiedDate,
        'article:tag': metaData.keywords,
        'article:publisher': metaData.blog.facebook || undefined,
        'article:author': metaData.authorFacebook || undefined,
        'twitter:card': card,
        'twitter:title': metaData.metaTitle,
        'twitter:description': metaData.metaDescription || metaData.excerpt,
        'twitter:url': metaData.canonicalUrl,
        'twitter:image:src': metaData.coverImage,
        'twitter:label1': metaData.authorName ? 'Written by' : undefined,
        'twitter:data1': metaData.authorName,
        'twitter:label2': metaData.keywords ? 'Filed under' : undefined,
        'twitter:data2': metaData.keywords ? metaData.keywords.join(', ') : undefined,
        'twitter:site': twitterSite || undefined,
        'twitter:creator': twitterCreator || undefined
    };

    // return structured data removing null or undefined keys
    return Object.keys(structuredData).reduce(function (data, key) {
        var content = structuredData[key];
        if (content !== null && typeof content !== 'undefined') {
            data[key] = content;
        }
        return data;
    }, {});
}

module.exports = getStructuredData;
