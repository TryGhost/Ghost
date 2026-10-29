/**
 * @typedef {import('./mentions-api').IRoutingService} IRoutingService
 * @typedef {import('./mentions-api').IResourceService} IResourceService
 */

/**
 * @typedef {object} IUrlUtils
 * @prop {() => string} getSiteUrl
 * @prop {() => string} getSubdir
 */

/**
 * @implements {IRoutingService}
 */
module.exports = class RoutingService {
  /** @typedef {URL} */
  #siteUrl;

  /** @typedef {IResourceService} */
  #resourceService;

  /** @typedef {import('got')} */
  #externalRequest;

  /** @type {import('@tryghost/logging')} */
  #logging;

  /**
   * @param {object} deps
   * @param {URL} deps.siteUrl
   * @param {IResourceService} deps.resourceService
   * @param {import('got')} deps.externalRequest;
   * @param {import('@tryghost/logging')} deps.logging
   */
  constructor(deps) {
    this.#siteUrl = deps.siteUrl;
    this.#resourceService = deps.resourceService;
    this.#externalRequest = deps.externalRequest;
    this.#logging = deps.logging;
  }

  /**
   * @param {URL} url
   */
  async pageExists(url) {
    if (this.#siteUrl.origin !== url.origin) {
      return false;
    }
    const subdir = removeTrailingSlash(this.#siteUrl.pathname);
    if (subdir && !url.pathname.startsWith(subdir)) {
      return false;
    }

    const resource = await this.#resourceService.getByURL(url);

    if (resource?.type !== null) {
      return true;
    }

    try {
      const response = await this.#externalRequest.head(url, {
        followRedirect: false,
        throwHttpErrors: false,
      });
      if (response.statusCode < 400 && response.statusCode > 199) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      this.#logging.error(err);
      return false;
    }
  }
};

/**
 * @param {string} str
 */
function removeTrailingSlash(str) {
  return str.replace(/\/$/, '');
}
