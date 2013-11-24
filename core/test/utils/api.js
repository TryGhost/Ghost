var _ = require('underscore'),
    url = require('url'),
    ApiRouteBase = '/ghost/api/v0.1/',
    host = 'localhost',
    port = '2369';
    schema = "http://",
    expectedProperties = {
        posts: ['posts', 'page', 'limit', 'pages', 'total'],
        post: ['id', 'uuid', 'title', 'slug', 'markdown', 'html', 'meta_title', 'meta_description',
            'featured', 'image', 'status', 'language', 'author_id', 'created_at', 'created_by', 'updated_at', 'updated_by',
            'published_at', 'published_by', 'page', 'author', 'user', 'tags'],
        // TODO: remove databaseVersion
        settings: ['databaseVersion', 'title', 'description', 'email', 'logo', 'cover', 'defaultLang', "permalinks",
            'postsPerPage', 'forceI18n', 'activeTheme', 'activePlugins', 'installedPlugins', 'availableThemes'],
        tag: ['id', 'uuid', 'name', 'slug', 'description', 'parent_id',
            'meta_title', 'meta_description', 'created_at', 'created_by', 'updated_at', 'updated_by'],
        user: ['id', 'uuid', 'name', 'slug', 'email', 'image', 'cover', 'bio', 'website',
            'location', 'accessibility', 'status', 'language', 'meta_title', 'meta_description',
            'created_at', 'updated_at']
    };


function getApiURL (route) {
    var baseURL = url.resolve(schema + host + ':' + port, ApiRouteBase);
    return url.resolve(baseURL, route);
}
function getSigninURL () {
    return url.resolve(schema + host + ':' + port, 'ghost/signin/');
}
function getAdminURL () {
    return url.resolve(schema + host + ':' + port, 'ghost/');
}

// make sure the API only returns expected properties only
function checkResponse (jsonResponse, objectType) {
    checkResponseValue(jsonResponse, expectedProperties[objectType]);
}
function checkResponseValue (jsonResponse, properties) {
    Object.keys(jsonResponse).length.should.eql(properties.length);
    for(var i=0; i<properties.length; i = i + 1) {
        jsonResponse.should.have.property(properties[i]);
    }
}

module.exports = {
    getApiURL: getApiURL,
    getSigninURL: getSigninURL,
    getAdminURL: getAdminURL,
    checkResponse: checkResponse,
    checkResponseValue: checkResponseValue,
};
