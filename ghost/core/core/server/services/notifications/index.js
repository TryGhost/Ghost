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

const fetchAdminEmails = async () => {
    const users = await models.User.findActiveAdministrators();
    return users.map(user => user.email);
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
