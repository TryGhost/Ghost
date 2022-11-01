const debug = require('@tryghost/debug')('api:endpoints:utils:permissions');
const _ = require('lodash');
const permissions = require('../../../services/permissions');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    noPermissionToCall: 'You do not have permission to {method} {docName}'
};

/**
 * @description Handle requests, which need authentication.
 *
 * @param {Object} apiConfig - Docname & method of API ctrl
 * @param {Object} frame
 * @return {Promise}
 */
const nonePublicAuth = (apiConfig, frame) => {
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

    let unsafeAttrObject = apiConfig.unsafeAttrs && _.has(frame, `data.[${apiConfig.docName}][0]`) ? _.pick(frame.data[apiConfig.docName][0], apiConfig.unsafeAttrs) : {};

    if (apiConfig.unsafeAttrsObject) {
        unsafeAttrObject = apiConfig.unsafeAttrsObject(frame);
    }

    const permsPromise = permissions.canThis(frame.options.context)[apiConfig.method][singular](permissionIdentifier, unsafeAttrObject);

    return permsPromise.then((result) => {
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
            frame.data[apiConfig.docName][0] = _.omit(frame.data[apiConfig.docName][0], result.excludedAttrs);
        }
    }).catch((err) => {
        if (err instanceof errors.NoPermissionError) {
            err.message = tpl(messages.noPermissionToCall, {
                method: apiConfig.method,
                docName: apiConfig.docName
            });
            return Promise.reject(err);
        }

        if (errors.utils.isGhostError(err)) {
            return Promise.reject(err);
        }

        return Promise.reject(new errors.InternalServerError({
            err: err
        }));
    });
};

// @TODO: https://github.com/TryGhost/Ghost/issues/10735
module.exports = {
    /**
     * @description Handle permission stage for API.
     *
     * @param {Object} apiConfig - Docname & method of target ctrl.
     * @param {Object} frame
     * @return {Promise}
     */
    handle(apiConfig, frame) {
        debug('handle');

        // @TODO: https://github.com/TryGhost/Ghost/issues/10099
        frame.options.context = permissions.parseContext(frame.options.context);

        // CASE: Content API access
        if (frame.options.context.public && frame.apiType !== 'comments') {
            debug('content api permissions pass-through');
            return Promise.resolve(frame.options);
        }

        return nonePublicAuth(apiConfig, frame);
    }
};
