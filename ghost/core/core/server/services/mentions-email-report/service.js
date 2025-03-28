const MentionEmailReportJob = require('./MentionEmailReportJob');

/**
 * @typedef {MentionEmailReportJob.MentionReport} MentionReport
 * @typedef {MentionEmailReportJob.MentionReportRecipient} MentionReportRecipient
 */

let initialised = false;

module.exports = {
    async init() {
        if (initialised) {
            return;
        }

        const mentions = require('../mentions');
        const mentionReportGenerator = {
            getMentionReport(startDate, endDate) {
                return mentions.api.getMentionReport(startDate, endDate);
            }
        };

        const models = require('../../models');
        const mentionReportRecipientRepository = {
            async getMentionReportRecipients() {
                const users = await models.User.getEmailAlertUsers('mention-received');
                return users.map((model) => {
                    return {
                        email: model.email,
                        slug: model.slug
                    };
                });
            }
        };

        const staffService = require('../staff');
        const mentionReportEmailView = {
            /**
             * @returns {Promise<string>}
             */
            async renderSubject(report) {
                const sourceSiteTitles = report?.mentions?.map(mention => mention.sourceSiteTitle);
                const uniqueSourceSiteTitles = [...new Set(sourceSiteTitles)];
                const totalSiteMentions = uniqueSourceSiteTitles.length;
                const firstMentionSite = uniqueSourceSiteTitles[0];

                let subject = 'Mention Report';

                if (totalSiteMentions === 1) {
                    subject = `${firstMentionSite} mentioned you`;
                } else if (totalSiteMentions === 2) {
                    subject = `${firstMentionSite} & 1 other mentioned you`;
                } else if (totalSiteMentions > 2) {
                    subject = `${firstMentionSite} & ${totalSiteMentions - 1} others mentioned you`;
                }

                return subject;
            },

            /**
             * @param {MentionReport} report
             * @param {MentionReportRecipient} recipient
             * @returns {Promise<string>}
             */
            async renderHTML(report, recipient) {
                // Filter out mentions with duplicate source url from the report
                const uniqueMentions = report.mentions.filter((mention, index, self) => {
                    return self.findIndex(m => m.sourceUrl.href === mention.sourceUrl.href) === index;
                });

                return staffService.api.emails.renderHTML('mention-report', {
                    mentions: uniqueMentions,
                    recipient: recipient,
                    hasMoreMentions: report.mentions.length > 5
                });
            },

            /**
             * @param {MentionReport} report
             * @param {MentionReportRecipient} recipient
             * @returns {Promise<string>}
             */
            async renderText(report, recipient) {
                // Filter out mentions with duplicate source url from the report
                const uniqueMentions = report.mentions.filter((mention, index, self) => {
                    return self.findIndex(m => m.sourceUrl.href === mention.sourceUrl.href) === index;
                });

                return staffService.api.emails.renderText('mention-report', {
                    mentions: uniqueMentions,
                    recipient: recipient
                });
            }
        };

        const settingsCache = require('../../../shared/settings-cache');
        const mentionReportHistoryService = {
            async getLatestReportDate() {
                const setting = settingsCache.get('last_mentions_report_email_timestamp');
                const parsedInt = parseInt(setting);

                // Protect against missing/bad data
                if (Number.isNaN(parsedInt) || !parsedInt) {
                    const date = new Date();
                    date.setDate(date.getDate() - 1);
                    return date;
                }

                return new Date(parsedInt);
            },
            async setLatestReportDate(date) {
                await models.Settings.edit({
                    key: 'last_mentions_report_email_timestamp',
                    value: date.getTime()
                });
            }
        };

        const mail = require('../mail');
        const mailer = new mail.GhostMailer();
        const emailService = {
            async send(to, subject, html, text) {
                return mailer.send({
                    to,
                    subject,
                    html,
                    text
                });
            }
        };

        const job = new MentionEmailReportJob({
            mentionReportGenerator,
            mentionReportRecipientRepository,
            mentionReportEmailView,
            mentionReportHistoryService,
            emailService
        });

        const mentionsJobs = require('../mentions-jobs');

        const DomainEvents = require('@tryghost/domain-events');
        const StartMentionEmailReportJob = require('./StartMentionEmailReportJob');

        const labs = require('../../../shared/labs');
        DomainEvents.subscribe(StartMentionEmailReportJob, () => {
            if (labs.isSet('webmentions')) {
                job.sendLatestReport();
            }
        });

        // Kick off the job on boot, this will make sure that we send a missing report if needed
        DomainEvents.dispatch(StartMentionEmailReportJob.create());

        const s = Math.floor(Math.random() * 60); // 0-59
        const m = Math.floor(Math.random() * 60); // 0-59

        // Schedules a job every hour at a random minute and second to send the latest report
        mentionsJobs.addJob({
            name: 'mentions-email-report',
            job: require('path').resolve(__dirname, './job.js'),
            at: `${s} ${m} * * * *`
        });

        initialised = true;
    }
};
