const common = require('../lib/common');
const membersService = require('./members');
const bulkEmailService = require('./bulk-email');
const models = require('../models');
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
        subject: post.posts_meta.email_subject || post.title,
        html: template({post, site: getSite()})
    };

    const {members} = await membersService.api.members.list();
    const emails = members.map(m => m.email);

    return bulkEmailService.send(emailTmpl, emails);
};

function listener(model, options) {
    // CASE: do not send email if we import a database
    // TODO: refactor post.published events to never fire on importing
    if (options && options.importing) {
        return;
    }

    if (!model.get('send_email_when_published')) {
        return;
    }

    sendEmail(model.toJSON()).then(async () => {
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
