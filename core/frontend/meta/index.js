// Public API (only used in proxy.js)
module.exports = {
    get: require('./get-meta'), // ghost_head
    getAssetUrl: require('./asset_url'), // asset
    getMetaDataExcerpt: require('./generate-excerpt'), // excerpt
    getMetaDataDescription: require('./description'), // meta_desc
    getMetaDataTitle: require('./title'), // meta_title
    getPaginatedUrl: require('./paginated_url'), // page_url
    getMetaDataUrl: require('./url') // url
};
