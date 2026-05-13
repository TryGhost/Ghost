import {NotificationRepository} from './repository';
import {NotificationService} from './service';
import {createAlertEmailReactor} from './alert-email-reactor';
import * as ghsa from './feeds/ghsa';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const settingsCache = require('../../../shared/settings-cache') as {get(key: string): unknown};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const models = require('../../models') as {
    Settings: {edit(updates: Array<{key: string; value: string}>, opts: {context: {internal: true}}): Promise<unknown>};
    User: {findActiveAdministrators(): Promise<Array<{email: string}>>};
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ghostVersion = require('@tryghost/version') as {full: string; original: string};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const urlUtils = require('../../../shared/url-utils') as {urlFor(loc: string, absolute: boolean): string};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mail = require('../mail') as {
    GhostMailer: new () => {
        send(opts: {to: string; subject: string; html: string; text?: string; forceTextContent?: boolean}): Promise<unknown>;
    };
    utils: {
        generateContent(opts: {template: string; data: Record<string, unknown>}): Promise<{html: string; text?: string}>;
    };
};

const repository = new NotificationRepository({
    settingsCache,
    settingsModel: models.Settings
});

const ghostMailer = new mail.GhostMailer();

const fetchAdminEmails = async (): Promise<string[]> => {
    const users = await models.User.findActiveAdministrators();
    return users.map(user => user.email);
};

const alertEmailReactor = createAlertEmailReactor({
    sendEmail: ghostMailer.send.bind(ghostMailer),
    fetchAdminEmails,
    getSiteUrl: () => urlUtils.urlFor('home', true),
    renderTemplate: mail.utils.generateContent
});

export const notifications = new NotificationService({
    repository,
    ghostVersion,
    afterAdd: alertEmailReactor
});

export function registerWorkers(jobsService: ghsa.JobsService): void {
    ghsa.register(jobsService);
}
