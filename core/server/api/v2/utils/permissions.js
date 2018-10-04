const debug = require('ghost-ignition').debug('api:v2:utils:permissions');
const Promise = require('bluebird');
const _ = require('lodash');
const permissions = require('../../../services/permissions');
const common = require('../../../lib/common');

const nonePublicAuth = (config, options) => {
    debug('check admin permissions');

    const singular = config.docName.replace(/s$/, '');

    let unsafeAttrObject = config.unsafeAttrs && _.has(options, `data.[${config.docName}][0]`) ? _.pick(options.data[config.docName][0], config.unsafeAttrs) : {},
        permsPromise = permissions.canThis(options.modelOptions.context)[config.method][singular](options.modelOptions.id, unsafeAttrObject);

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
        if (result && result.excludedAttrs && _.has(options, `data.[${config.docName}][0]`)) {
            options.data[config.docName][0] = _.omit(options.data[config.docName][0], result.excludedAttrs);
        }
    }).catch((err) => {
        if (err instanceof common.errors.NoPermissionError) {
            err.message = common.i18n.t('errors.api.utils.noPermissionToCall', {
                method: config.method,
                docName: config.docName
            });
            return Promise.reject(err);
        }

        if (common.errors.utils.isIgnitionError(err)) {
            return Promise.reject(err);
        }

        return Promise.reject(new common.errors.GhostError({
            err: err
        }));
    });
};

module.exports = {
    handle(apiConfig, frame) {
        debug('handle');

        frame.options.context = permissions.parseContext(frame.options.context);

        if (frame.options.context.public) {
            debug('check content permissions');

            // @TODO: The permission layer relies on the API format from v0.1. The permission layer should define
            //        it's own format and should not re-use or rely on the API format. For now we have to simulate the v0.1
            //        structure. We should raise an issue asap.
            return permissions.applyPublicRules(apiConfig.docName, apiConfig.method, {
                status: frame.options.status,
                id: frame.options.id,
                uuid: frame.options.uuid,
                slug: frame.options.slug,
                data: {
                    status: frame.data.status,
                    id: frame.data.id,
                    uuid: frame.data.uuid,
                    slug: frame.data.slug
                }
            });
        }

        return nonePublicAuth(apiConfig, frame);
    }
};
