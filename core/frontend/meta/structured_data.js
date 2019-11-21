var socialUrls = require('@tryghost/social-urls');

function getStructuredData(metaData) {
    var structuredData,
        card = 'summary';

    if (metaData.twitterImage || metaData.coverImage.url) {
        card = 'summary_large_image';
    }

    structuredData = {
        'og:site_name': metaData.site.title,
        'og:type': metaData.ogType,
        'og:title': metaData.ogTitle,
        // CASE: metaData.excerpt for post context is populated by either the custom excerpt,
        // the meta description, or the automated excerpt of 50 words. It is empty for any
        // other context and *always* uses the provided meta description fields.
        'og:description': metaData.ogDescription,
        'og:url': metaData.canonicalUrl,
        'og:image': metaData.ogImage.url || metaData.coverImage.url,
        'article:published_time': metaData.publishedDate,
        'article:modified_time': metaData.modifiedDate,
        'article:tag': metaData.keywords,
        'article:publisher': metaData.site.facebook ? socialUrls.facebook(metaData.site.facebook) : undefined,
        'article:author': metaData.authorFacebook ? socialUrls.facebook(metaData.authorFacebook) : undefined,
        'twitter:card': card,
        'twitter:title': metaData.twitterTitle,
        'twitter:description': metaData.twitterDescription,
        'twitter:url': metaData.canonicalUrl,
        'twitter:image': metaData.twitterImage || metaData.coverImage.url,
        'twitter:label1': metaData.authorName ? 'Written by' : undefined,
        'twitter:data1': metaData.authorName,
        'twitter:label2': metaData.keywords ? 'Filed under' : undefined,
        'twitter:data2': metaData.keywords ? metaData.keywords.join(', ') : undefined,
        'twitter:site': metaData.site.twitter || undefined,
        'twitter:creator': metaData.creatorTwitter || undefined
    };

    if (metaData.ogImage.dimensions) {
        structuredData['og:image:width'] = metaData.ogImage.dimensions.width;
        structuredData['og:image:height'] = metaData.ogImage.dimensions.height;
    } else if (metaData.coverImage.dimensions) {
        structuredData['og:image:width'] = metaData.coverImage.dimensions.width;
        structuredData['og:image:height'] = metaData.coverImage.dimensions.height;
    }

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
