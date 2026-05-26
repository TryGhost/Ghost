const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const settingsService = require('../settings/settings-service');
const mailService = require('../mail');
const models = require('../../models');
const Notifications = require('./notifications');
const {NotificationRepository} = require('./repository');
const {createAlertEmailReactor} = require('./email-reactor');

const repository = new NotificationRepository({
    settingsCache,
    getSettingsBREADService: () => settingsService.getSettingsBREADServiceInstance(),
    settingsModel: models.Settings
});

const ghostMailer = new mailService.GhostMailer();

const getAdminEmails = async () => {
    const users = await models.User.findAll({filter: 'status:active', withRelated: ['roles']});
    return users.toJSON()
        .filter(user => user?.roles?.some(role => ['Owner', 'Administrator'].includes(role.name)))
        .map(user => user.email)
        .filter(Boolean);
};

const maybeSendEmail = createAlertEmailReactor({
    sendEmail: ghostMailer.send.bind(ghostMailer),
    generateEmailContent: mailService.utils.generateContent,
    getAdminEmails,
    getSiteUrl: () => urlUtils.urlFor('home', true)
});

module.exports.notifications = new Notifications({repository, maybeSendEmail});
