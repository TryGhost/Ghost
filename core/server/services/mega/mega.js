const juice = require('juice');
const common = require('../../lib/common');
const api = require('../../api');
const membersService = require('../members');
const bulkEmailService = require('../bulk-email');
const models = require('../../models');
const template = require('./template');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../lib/url-utils');

const getSite = () => {
    return Object.assign({}, settingsCache.getPublic(), {
        url: urlUtils.urlFor('home', true)
    });
};

const sendEmail = async (post) => {
    const emailTmpl = {
        subject: post.email_subject || post.title,
        html: juice(template({post, site: getSite()}))
    };

    const {members} = await membersService.api.members.list();
    const emails = members.map(m => m.email);

    return bulkEmailService.send(emailTmpl, emails);
};

// NOTE: serialization is needed to make sure we are using current API and do post transformations
//       such as image URL transformation from relative to absolute
const serialize = async (model) => {
    const frame = {options: {previous: true, context: {user: true}}};
    const apiVersion = model.get('api_version') || 'v3';
    const docName = 'posts';

    await api.shared
        .serializers
        .handle
        .output(model, {docName: docName, method: 'read'}, api[apiVersion].serializers.output, frame);

    return frame.response[docName][0];
};

async function listener(model, options) {
    // CASE: do not send email if we import a database
    // TODO: refactor post.published events to never fire on importing
    if (options && options.importing) {
        return;
    }

    const post = await serialize(model);

    if (!post.send_email_when_published) {
        return;
    }

    sendEmail(post).then(async () => {
        const deliveredEvents = await models.Action.findAll({
            filter: `event:delivered+resource_id:${model.id}`
        });
        if (deliveredEvents && deliveredEvents.toJSON().length > 0) {
            return;
        }
        let actor = {id: null, type: null};
        if (options.context && options.context.user) {
            actor = {
                id: options.context.user,
                type: 'user'
            };
        }
        const action = {
            event: 'delivered',
            resource_id: model.id,
            resource_type: 'post',
            actor_id: actor.id,
            actor_type: actor.type
        };
        return models.Action.add(action, {context: {internal: true}});
    });
}

function listen() {
    common.events.on('post.published', listener);
}

// Public API
module.exports = {
    listen: listen
};
