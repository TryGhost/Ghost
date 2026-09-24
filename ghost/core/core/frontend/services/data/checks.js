function isPost(jsonData) {
  return (
    Object.hasOwn(jsonData, 'html') &&
    Object.hasOwn(jsonData, 'title') &&
    Object.hasOwn(jsonData, 'slug')
  );
}

function isNewsletter(jsonData) {
  return (
    Object.hasOwn(jsonData, 'name') &&
    Object.hasOwn(jsonData, 'subscribe_on_signup') &&
    Object.hasOwn(jsonData, 'visibility')
  );
}

function isPage(jsonData = {}) {
  return Object.hasOwn(jsonData, 'show_title_and_feature_image');
}

function isTag(jsonData) {
  return (
    Object.hasOwn(jsonData, 'name') &&
    Object.hasOwn(jsonData, 'slug') &&
    Object.hasOwn(jsonData, 'description') &&
    Object.hasOwn(jsonData, 'feature_image')
  );
}

function isUser(jsonData) {
  return (
    Object.hasOwn(jsonData, 'bio') &&
    Object.hasOwn(jsonData, 'website') &&
    Object.hasOwn(jsonData, 'profile_image') &&
    Object.hasOwn(jsonData, 'location')
  );
}

function isNav(jsonData) {
  return (
    Object.hasOwn(jsonData, 'label') &&
    Object.hasOwn(jsonData, 'url') &&
    Object.hasOwn(jsonData, 'slug') &&
    Object.hasOwn(jsonData, 'current')
  );
}

module.exports = {
  isPost,
  isNewsletter,
  isPage,
  isTag,
  isUser,
  isNav,
};
