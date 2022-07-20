const _ = require('lodash');

const mapTag = require('./tags');
const mapUser = require('./users');
const mapEmail = require('./emails');

const clean = require('../utils/clean');
const date = require('../utils/date');
const extraAttrs = require('../utils/extra-attrs');
const gating = require('../utils/post-gating');
const url = require('../utils/url');

const utils = require('../../../index');

const postsMetaSchema = require('../../../../../../data/schema').tables.posts_meta;

const getPostServiceInstance = require('../../../../../../services/posts/posts-service');
const postsService = getPostServiceInstance();

module.exports = async (model, frame, options = {}) => {
    const {tiers: tiersData} = options || {};
    const extendedOptions = Object.assign(_.cloneDeep(frame.options), {
        extraProperties: ['canonical_url']
    });

    const jsonModel = model.toJSON(extendedOptions);

    // Map email_recipient_filter to email_segment
    jsonModel.email_segment = jsonModel.email_recipient_filter;
    delete jsonModel.email_recipient_filter;

    url.forPost(model.id, jsonModel, frame);

    extraAttrs.forPost(frame, model, jsonModel);

    // Attach tiers to custom nql visibility filter
    if (jsonModel.visibility) {
        if (['members', 'public'].includes(jsonModel.visibility) && jsonModel.tiers) {
            jsonModel.tiers = tiersData || [];
        }

        if (jsonModel.visibility === 'paid' && jsonModel.tiers) {
            jsonModel.tiers = tiersData ? tiersData.filter(t => t.type === 'paid') : [];
        }

        if (!['members', 'public', 'paid', 'tiers'].includes(jsonModel.visibility)) {
            const tiers = await postsService.getProductsFromVisibilityFilter(jsonModel.visibility);

            jsonModel.visibility = 'tiers';
            jsonModel.tiers = tiers;
        }
    }

    if (utils.isContentAPI(frame)) {
        date.forPost(jsonModel);
        gating.forPost(jsonModel, frame);
    }

    // Transforms post/page metadata to flat structure
    let metaAttrs = _.keys(_.omit(postsMetaSchema, ['id', 'post_id']));
    _(metaAttrs).filter((k) => {
        return (!frame.options.columns || (frame.options.columns && frame.options.columns.includes(k)));
    }).each((attr) => {
        // NOTE: the default of `email_only` is `false` which is why we default to `false` instead of `null`
        //       The undefined value is possible because `posts_meta` table is lazily created only one of the
        //       values is assigned.
        const defaultValue = (attr === 'email_only') ? false : null;
        jsonModel[attr] = _.get(jsonModel.posts_meta, attr) || defaultValue;
    });
    delete jsonModel.posts_meta;

    clean.post(jsonModel, frame);

    if (frame.options && frame.options.withRelated) {
        frame.options.withRelated.forEach((relation) => {
            // @NOTE: this block also decorates primary_tag/primary_author objects as they
            // are being passed by reference in tags/authors. Might be refactored into more explicit call
            // in the future, but is good enough for current use-case
            if (relation === 'tags' && jsonModel.tags) {
                jsonModel.tags = jsonModel.tags.map(tag => mapTag(tag, frame));
            }

            if (relation === 'authors' && jsonModel.authors) {
                jsonModel.authors = jsonModel.authors.map(author => mapUser(author, frame));
            }

            if (relation === 'email' && jsonModel.email) {
                jsonModel.email = mapEmail(jsonModel.email, frame);
            }

            if (relation === 'email' && _.isEmpty(jsonModel.email)) {
                jsonModel.email = null;
            }

            if (relation === 'newsletter' && _.isEmpty(jsonModel.newsletter)) {
                jsonModel.newsletter = null;
            }
        });
    }

    return jsonModel;
};
