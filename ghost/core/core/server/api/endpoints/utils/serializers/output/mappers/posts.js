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

const commentsService = require('../../../../../../services/comments');
const memberAttribution = require('../../../../../../services/member-attribution');
const labs = require('../../../../../../../shared/labs');

module.exports = async (model, frame, options = {}) => {
    const {tiers: tiersData} = options || {};

    // NOTE: `model` is now overloaded and may be a bookshelf model or a POJO
    let jsonModel = model;
    if (typeof model.toJSON === 'function') {
        jsonModel = model.toJSON(frame.options);
    } else {
        // This is to satisfy the interface which extraAttrs needs
        model = {
            id: jsonModel.id,
            get(attr) {
                return jsonModel[attr];
            }
        };
    }

    // Map email_recipient_filter to email_segment
    jsonModel.email_segment = jsonModel.email_recipient_filter;
    delete jsonModel.email_recipient_filter;

    url.forPost(model.id, jsonModel, frame);

    extraAttrs.forPost(frame.options, model, jsonModel);

    const defaultFormats = ['html'];
    const formatsToKeep = frame.options.formats || frame.options.columns || defaultFormats;

    // Iterate over all known formats, and if they are not in the keep list, remove them
    _.each(['mobiledoc', 'lexical', 'html', 'plaintext'], function (format) {
        if (formatsToKeep.indexOf(format) === -1) {
            delete jsonModel[format];
        }
    });

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

        if (jsonModel.access) {
            if (commentsService?.api?.enabled !== 'off') {
                jsonModel.comments = true;
            } else {
                jsonModel.comments = false;
            }
        } else {
            jsonModel.comments = false;
        }

        // Strip any source formats
        delete jsonModel.mobiledoc;
        delete jsonModel.lexical;

        // Add  outbound link tags
        if (labs.isSet('outboundLinkTagging')) {
            // Only add it in the flag! Without the flag we only add it to emails.
            if (jsonModel.html) {
                // Only set if HTML was requested
                jsonModel.html = await memberAttribution.outboundLinkTagger.addToHtml(jsonModel.html);
            }
        }
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

    if (jsonModel.email && jsonModel.count) {
        jsonModel.email.opened_count = Math.min(
            jsonModel.email.opened_count || 0,
            jsonModel.email.email_count
        );
    }

    // The sentiment has been loaded as a count relation in count.sentiment. But externally in the API we use just 'sentiment' instead of count.sentiment
    // This part moves count.sentiment to just 'sentiment' when it has been loaded
    if (frame.options.withRelated && frame.options.withRelated.includes('count.sentiment')) {
        if (!jsonModel.count) {
            jsonModel.sentiment = 0;
        } else {
            jsonModel.sentiment = jsonModel.count.sentiment ?? 0;

            // Delete it from the original location
            delete jsonModel.count.sentiment;

            if (Object.keys(jsonModel.count).length === 0) {
                delete jsonModel.count;
            }
        }
    }

    if (jsonModel.count && !jsonModel.count.positive_feedback) {
        jsonModel.count.positive_feedback = 0;
    }

    if (jsonModel.count && !jsonModel.count.negative_feedback) {
        jsonModel.count.negative_feedback = 0;
    }

    return jsonModel;
};
