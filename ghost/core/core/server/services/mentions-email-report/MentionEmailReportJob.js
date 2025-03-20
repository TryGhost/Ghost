module.exports = class MentionEmailReportJob {
    /** @type {IMentionReportGenerator} */
    #mentionReportGenerator;

    /** @type {IMentionReportRecipientRepository} */
    #mentionReportRecipientRepository;

    /** @type {IMentionReportEmailView} */
    #mentionReportEmailView;

    /** @type {IMentionReportHistoryService} */
    #mentionReportHistoryService;

    /** @type {IEmailService} */
    #emailService;

    /**
     * @param {object} deps
     * @param {IMentionReportGenerator} deps.mentionReportGenerator
     * @param {IMentionReportRecipientRepository} deps.mentionReportRecipientRepository
     * @param {IMentionReportEmailView} deps.mentionReportEmailView
     * @param {IMentionReportHistoryService} deps.mentionReportHistoryService
     * @param {IEmailService} deps.emailService
     */
    constructor(deps) {
        this.#mentionReportGenerator = deps.mentionReportGenerator;
        this.#mentionReportRecipientRepository = deps.mentionReportRecipientRepository;
        this.#mentionReportEmailView = deps.mentionReportEmailView;
        this.#mentionReportHistoryService = deps.mentionReportHistoryService;
        this.#emailService = deps.emailService;
    }

    /**
     * Checks for new mentions since the last report and sends an email to the recipients.
     *
     * @returns {Promise<number>} - A promise that resolves with the number of mentions found.
     */
    async sendLatestReport() {
        const lastReport = await this.#mentionReportHistoryService.getLatestReportDate();
        const now = new Date();

        if (now.valueOf() - lastReport.valueOf() < 24 * 60 * 60 * 1000) {
            return 0;
        }

        const report = await this.#mentionReportGenerator.getMentionReport(lastReport, now);

        report.mentions = report.mentions.map((mention) => {
            return {
                targetUrl: mention.target,
                sourceUrl: mention.source,
                sourceTitle: mention.sourceTitle,
                sourceExcerpt: mention.sourceExcerpt,
                sourceSiteTitle: mention.sourceSiteTitle,
                sourceFavicon: mention.sourceFavicon,
                sourceAuthor: mention.sourceAuthor,
                sourceFeaturedImage: mention.sourceFeaturedImage
            };
        });

        if (!report?.mentions?.length) {
            return 0;
        }

        const recipients = await this.#mentionReportRecipientRepository.getMentionReportRecipients();

        for (const recipient of recipients) {
            const subject = await this.#mentionReportEmailView.renderSubject(report, recipient);
            const html = await this.#mentionReportEmailView.renderHTML(report, recipient);
            const text = await this.#mentionReportEmailView.renderText(report, recipient);

            await this.#emailService.send(recipient.email, subject, html, text);
        }

        await this.#mentionReportHistoryService.setLatestReportDate(now);

        return report.mentions.length;
    }
};

/**
 * @typedef {object} MentionReportRecipient
 * @prop {string} email
 * @prop {string} slug
 */

/**
 * @typedef {object} IMentionReportRecipientRepository
 * @prop {() => Promise<MentionReportRecipient[]>} getMentionReportRecipients
 */

/**
 * @typedef {import('@tryghost/webmentions/lib/MentionsAPI').MentionReport} MentionReport
 */

/**
 * @typedef {object} IMentionReportGenerator
 * @prop {(startDate: Date, endDate: Date) => Promise<MentionReport>} getMentionReport
 */

/**
 * @typedef {object} IMentionReportEmailView
 * @prop {(report: MentionReport, recipient: MentionReportRecipient) => Promise<string>} renderHTML
 * @prop {(report: MentionReport, recipient: MentionReportRecipient) => Promise<string>} renderText
 * @prop {(report: MentionReport, recipient: MentionReportRecipient) => Promise<string>} renderSubject
 */

/**
 * @typedef {object} IEmailService
 * @prop {(to: string, subject: string, html: string, text: string) => Promise<void>} send
 */

/**
 * @typedef {object} IMentionReportHistoryService
 * @prop {() => Promise<Date>} getLatestReportDate
 * @prop {(date: Date) => Promise<void>} setLatestReportDate
 */
