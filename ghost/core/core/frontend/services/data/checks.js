function isPost(jsonData) {
    return Object.prototype.hasOwnProperty.call(jsonData, 'html') &&
        Object.prototype.hasOwnProperty.call(jsonData, 'title') && Object.prototype.hasOwnProperty.call(jsonData, 'slug');
}

function isTag(jsonData) {
    return Object.prototype.hasOwnProperty.call(jsonData, 'name') && Object.prototype.hasOwnProperty.call(jsonData, 'slug') &&
        Object.prototype.hasOwnProperty.call(jsonData, 'description') && Object.prototype.hasOwnProperty.call(jsonData, 'feature_image');
}

function isUser(jsonData) {
    return Object.prototype.hasOwnProperty.call(jsonData, 'bio') && Object.prototype.hasOwnProperty.call(jsonData, 'website') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'profile_image') && Object.prototype.hasOwnProperty.call(jsonData, 'location');
}

function isNav(jsonData) {
    return Object.prototype.hasOwnProperty.call(jsonData, 'label') && Object.prototype.hasOwnProperty.call(jsonData, 'url') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'slug') && Object.prototype.hasOwnProperty.call(jsonData, 'current');
}

module.exports = {
    isPost,
    isTag,
    isUser,
    isNav
};
