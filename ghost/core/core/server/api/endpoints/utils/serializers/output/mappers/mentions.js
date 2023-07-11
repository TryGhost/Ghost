module.exports = (model) => {
    const json = model.toJSON();

    return {
        id: json.id,
        source: json.source,
        target: json.target,
        timestamp: json.timestamp,
        payload: json.payload,
        resource: json.resource,
        source_title: json.sourceTitle,
        source_site_title: json.sourceSiteTitle,
        source_excerpt: json.sourceExcerpt,
        source_author: json.sourceAuthor,
        source_favicon: json.sourceFavicon,
        source_featured_image: json.sourceFeaturedImage,
        verified: json.verified
    };
};
