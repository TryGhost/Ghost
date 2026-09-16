/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/data/checks.js @ 407e032dc7 —
// transforms: CJS → ESM. Exposed as `checks` to mirror
// `require('../services/data')` destructuring in helpers.
function isPost(jsonData: any) {
  return (
    Object.prototype.hasOwnProperty.call(jsonData, 'html') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'title') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'slug')
  );
}

function isNewsletter(jsonData: any) {
  return (
    Object.prototype.hasOwnProperty.call(jsonData, 'name') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'subscribe_on_signup') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'visibility')
  );
}

function isPage(jsonData: any = {}) {
  return Object.prototype.hasOwnProperty.call(jsonData, 'show_title_and_feature_image');
}

function isTag(jsonData: any) {
  return (
    Object.prototype.hasOwnProperty.call(jsonData, 'name') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'slug') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'description') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'feature_image')
  );
}

function isUser(jsonData: any) {
  return (
    Object.prototype.hasOwnProperty.call(jsonData, 'bio') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'website') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'profile_image') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'location')
  );
}

function isNav(jsonData: any) {
  return (
    Object.prototype.hasOwnProperty.call(jsonData, 'label') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'url') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'slug') &&
    Object.prototype.hasOwnProperty.call(jsonData, 'current')
  );
}

export const checks = {
  isPost,
  isNewsletter,
  isPage,
  isTag,
  isUser,
  isNav,
};
