const debug = require('@tryghost/debug')('api:endpoints:utils:permissions');
const _ = require('lodash');
const permissions = require('../../../auth/permissions');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
  noPermissionToCall: 'You do not have permission to {method} {docName}',
  appsCannotCall: 'Apps do not have permission to {method} {docName}',
};

/**
 * The methods an app may call although they check no permission or check their own, so the
 * scopes an app was approved for can't limit them. A method is listed here only when it is safe
 * for any app, whatever its scopes; every other such method refuses apps.
 *
 * - `site.read`: the site's public title, description, logo, icon and accent colour, which
 *   Admin's bridge lets every app read
 */
const APP_UNCHECKED_ALLOWLIST = new Set(['site.read']);

/**
 * @description Handle requests, which need authentication.
 *
 * @param {Object} apiConfig - Docname & method of API ctrl
 * @param {import('@tryghost/api-framework').Frame} frame
 * @return {Promise}
 */
const nonePublicAuth = async (apiConfig, frame) => {
  debug('check admin permissions');

  let singular;
  if (apiConfig.docName.match(/ies$/)) {
    singular = apiConfig.docName.replace(/ies$/, 'y');
  } else {
    singular = apiConfig.docName.replace(/s$/, '');
  }
  let permissionIdentifier = frame.options.id;

  // CASE: Target ctrl can override the identifier. The identifier is the unique identifier of the target resource
  //       e.g. edit a setting -> the key of the setting
  //       e.g. edit a post -> post id from url param
  //       e.g. change user password -> user id inside of the body structure
  if (apiConfig.identifier) {
    permissionIdentifier = apiConfig.identifier(frame);
  }

  let unsafeAttrObject =
    apiConfig.unsafeAttrs && _.has(frame, `data.[${apiConfig.docName}][0]`)
      ? _.pick(frame.data[apiConfig.docName][0], apiConfig.unsafeAttrs)
      : {};

  if (apiConfig.unsafeAttrsObject) {
    unsafeAttrObject = apiConfig.unsafeAttrsObject(frame);
  }

  try {
    const permissionCheck = permissions.canThis(frame.options.context)[apiConfig.method][singular];
    const result = await permissionCheck(permissionIdentifier, unsafeAttrObject);

    /*
     * Allow the permissions function to return a list of excluded attributes.
     * If it does, omit those attrs from the data passed through
     *
     * NOTE: excludedAttrs differ from unsafeAttrs in that they're determined by the model's permissible function,
     * and the attributes are simply excluded rather than throwing a NoPermission exception
     *
     * TODO: This is currently only needed because of the posts model and the contributor role. Once we extend the
     * contributor role to be able to edit existing tags, this concept can be removed.
     */
    if (result && result.excludedAttrs && _.has(frame, `data.[${apiConfig.docName}][0]`)) {
      frame.data[apiConfig.docName][0] = _.omit(
        frame.data[apiConfig.docName][0],
        result.excludedAttrs,
      );
    }
  } catch (err) {
    if (err instanceof errors.NoPermissionError) {
      err.message = tpl(messages.noPermissionToCall, {
        method: apiConfig.method,
        docName: apiConfig.docName,
      });
      throw err;
    }

    if (errors.utils.isGhostError(err)) {
      throw err;
    }

    throw new errors.InternalServerError({
      err,
    });
  }
};

// @TODO: https://github.com/TryGhost/Ghost/issues/10735
module.exports = {
  /**
   * @description Handle permission stage for API.
   *
   * @param {Object} apiConfig - Docname & method of target ctrl.
   * @param {import('@tryghost/api-framework').Frame} frame
   * @return {Promise}
   */
  handle(apiConfig, frame) {
    debug('handle');

    // @TODO: https://github.com/TryGhost/Ghost/issues/10099
    frame.options.context = permissions.parseContext(frame.options.context);

    // CASE: Public API access (Content API and Members API)
    if (frame.options.context.public) {
      debug('public api permissions pass-through');
      return Promise.resolve(frame.options);
    }

    return nonePublicAuth(apiConfig, frame);
  },

  /**
   * @description Refuses an app on a method whose permission check is its own or none, unless
   * the method is on the allowlist. The scopes an app was approved for only cap the standard
   * check, so without this an app would act on such a method as the staff user it acts for.
   *
   * @param {Object} apiConfig - Docname & method of target ctrl.
   * @param {import('@tryghost/api-framework').Frame} frame
   */
  async handleUnchecked(apiConfig, frame) {
    if (frame.options.context?.principal?.kind !== 'app') {
      return;
    }
    if (APP_UNCHECKED_ALLOWLIST.has(`${apiConfig.docName}.${apiConfig.method}`)) {
      return;
    }
    throw new errors.NoPermissionError({
      message: tpl(messages.appsCannotCall, {
        method: apiConfig.method,
        docName: apiConfig.docName,
      }),
    });
  },

  APP_UNCHECKED_ALLOWLIST,
};
