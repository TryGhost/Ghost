const settingsCache = require('../../../shared/settings-cache');
const models = require('../../models');
const ghostVersion = require('@tryghost/version');
const urlUtils = require('../../../shared/url-utils');
const {GhostMailer} = require('../mail');
const {NotificationRepository} = require('./repository');
const {NotificationService} = require('./service');
const {createAlertEmailReactor} = require('./alert-email-reactor');

const repository = new NotificationRepository({
    settingsCache,
    settingsModel: models.Settings
});

const ghostMailer = new GhostMailer();

// api is required lazily to avoid a circular load between
// api/endpoints/notifications.js and this bootstrap.
const fetchAdminEmails = async () => {
    const api = require('../../api').endpoints;
    const {users} = await api.users.browse({
        limit: 'all',
        include: ['roles'],
        filter: 'status:active',
        context: {internal: true}
    });
    return users
        .filter(user => ['Owner', 'Administrator'].includes(user.roles[0].name))
        .map(user => user.email);
};

const alertEmailReactor = createAlertEmailReactor({
    sendEmail: ghostMailer.send.bind(ghostMailer),
    fetchAdminEmails,
    getSiteUrl: () => urlUtils.urlFor('home', true)
});

module.exports.notifications = new NotificationService({
    repository,
    ghostVersion,
    afterAdd: alertEmailReactor
});
