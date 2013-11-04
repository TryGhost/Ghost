var _ = require('underscore'),
    url = require('url'),
    ApiRouteBase = '/ghost/api/v0.1/',
    host = 'localhost',
    port = '2369';
    schema = "http://"

function getApiURL (route) {
    var baseURL = url.resolve(schema + host + ':' + port, ApiRouteBase);
    return url.resolve(baseURL, route);
}
function getSigninURL () {
    return url.resolve(schema + host + ':' + port, 'ghost/signin/');
}

// make sure the API only returns expected properties only
function checkResponse (jsonResponse, expectedProperties) {
    Object.keys(jsonResponse).length.should.eql(expectedProperties.length);
    for(var i=0; i<expectedProperties.length; i = i + 1) {
        jsonResponse.should.have.property(expectedProperties[i]);
    }
}

module.exports.getApiURL = getApiURL;
module.exports.getSigninURL = getSigninURL;
module.exports.checkResponse = checkResponse;
