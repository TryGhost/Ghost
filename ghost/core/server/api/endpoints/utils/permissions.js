const debug = require('@tryghost/debug')('api:endpoints:utils:permissions');
const _ = require('lodash');
const permissions = require('../../../auth/permissions');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const { capabilities, capabilityKey } = require('../../../auth/policy/capabilities');
const { scopesAllow } = require('../../../auth/policy/scopes');
const { noPermission } = require('../../../auth/policy/authorize');

const messages = {
  noPermissionToCall: 'You do not have permission to {method} {docName}',
  appsCannotCall: 'Apps do not have permission to {method} {docName}',
  appsCannotCallOutside: 'Apps do not have permission to call this endpoint',
};

/**
 * The methods an app may call although they check no permission or check their own, so the
 * scopes an app was approved for can't limit them. A method is listed here only when it is safe
 * for any app, whatever its scopes; every other such method refuses apps. None is yet. A
 * controller outside the pipeline has no name to list, so it runs through `pipeline()` first,
 * which for methods written as single functions adds only this check.
 */
const APP_UNCHECKED_ALLOWLIST = new Set();

/** The object type a docName names in permissions, e.g. `posts` → `post` */
const singularOf = (docName) =>
  docName.match(/ies$/) ? docName.replace(/ies$/, 'y') : docName.replace(/s$/, '');

/**
 * The permission key the standard check asks for, such as `post:browse`.
 *
 * @param {{docName: string, method: string}} apiConfig - Docname & method of API ctrl, or the
 * ones its `permissions` names in their place
 * @return {string}
 */
const permissionKey = (apiConfig) => capabilityKey(singularOf(apiConfig.docName), apiConfig.method);

/**
 * @description Handle requests, which need authentication.
 *
 * @param {Object} apiConfig - Docname & method of API ctrl
 * @param {import('@tryghost/api-framework').Frame} frame
 * @return {Promise}
 */
const nonePublicAuth = async (apiConfig, frame) => {
  debug('check admin permissions');

  const singular = singularOf(apiConfig.docName);
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

  /**
   * @description Refuses an app, ahead of the route's other middleware, on a method whose
   * permission stage would refuse it whatever the request: one it may not call unchecked, or one
   * whose standard check needs a scope the app wasn't approved for. Rate limits and uploads on
   * the route then never act for a request that can't succeed. The error is the one the stage
   * would throw; the role and row checks still run in the stage. A controller outside the
   * pipeline has no permission stage and no name the allowlist could hold, so it refuses apps.
   *
   * @param {import('@tryghost/api-framework').RoutedMethod} routed
   * @param {Object} principal - The request's principal
   */
  async refuseAppEarly(routed, principal) {
    if (principal?.kind !== 'app') {
      return;
    }
    if (!routed.docName || !routed.method) {
      throw new errors.NoPermissionError({ message: tpl(messages.appsCannotCallOutside) });
    }
    const { permissions: own, docName, method } = routed;
    // A method with no permissions of its own is written as a single function, which checks none
    if (own === undefined || own === false || typeof own === 'function') {
      return module.exports.handleUnchecked(
        { docName, method },
        { options: { context: { principal } } },
      );
    }
    const config = Object.assign({ docName, method }, typeof own === 'object' ? own : {});
    const key = permissionKey(config);
    if (!scopesAllow(capabilities(principal).scopes, key)) {
      const err = noPermission();
      err.message = tpl(messages.noPermissionToCall, {
        method: config.method,
        docName: config.docName,
      });
      throw err;
    }
  },

  APP_UNCHECKED_ALLOWLIST,
  permissionKey,
};
