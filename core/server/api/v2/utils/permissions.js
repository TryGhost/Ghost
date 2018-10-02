const Promise = require('bluebird');
const _ = require('lodash');
const permissions = require('../../../services/permissions');
const common = require('../../../lib/common');

const nonePublicAuth = (config, options) => {
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
    handle(config, options) {
        options.modelOptions.context = permissions.parseContext(options.modelOptions.context);

        if (options.modelOptions.context.public) {
            // @TODO: The permission layer relies on the API format from v0.1. The permission layer should define
            //        it's own format and should not re-use or rely on the API format. For now we have to simulate the v0.1
            //        structure. We should raise an issue asap.
            return permissions.applyPublicRules(config.docName, config.method, {
                status: options.modelOptions.status,
                id: options.modelOptions.id,
                uuid: options.modelOptions.uuid,
                slug: options.modelOptions.slug,
                data: {
                    status: options.queryData.status,
                    id: options.queryData.id,
                    uuid: options.queryData.uuid,
                    slug: options.queryData.slug
                }
            });
        }

        return nonePublicAuth(config, options);
    }
};
