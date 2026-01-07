const sinon = require('sinon');
const MentionEmailReportJob = require('../../../../../core/server/services/mentions-email-report/MentionEmailReportJob');

class MockMentionReportRecipientRepository {
    #recipients = [{
        email: 'fake@email.address',
        slug: 'user-slug'
    }];

    constructor(recipients) {
        if (recipients) {
            this.#recipients = recipients;
        }
    }

    async getMentionReportRecipients() {
        return this.#recipients;
    }
}

class MockMentionReportEmailView {
    async renderSubject() {
        return 'Mention Report';
    }

    async renderHTML() {
        return '<h1>Mention Report</h1>';
    }

    async renderText() {
        return 'Mention Report';
    }
}

class MockEmailService {
    async send() {
        return;
    }
}

class MockMentionReportHistoryService {
    #date = null;

    constructor(date) {
        if (!date) {
            throw new Error('Missing date');
        }
        this.#date = date;
    }

    async getLatestReportDate() {
        return this.#date;
    }

    async setLatestReportDate(date) {
        this.#date = date;
    }
}

class MockMentionReportGenerator {
    #mentions = null;

    constructor(mentions) {
        if (!mentions) {
            throw new Error('Missing mentions');
        }
        this.#mentions = mentions;
    }

    async getMentionReport(startDate, endDate) {
        return {
            startDate,
            endDate,
            mentions: this.#mentions
        };
    }
}

describe('MentionEmailReportJob', function () {
    describe('sendLatestReport', function () {
        it('Does not send an email if the report has no mentions', async function () {
            const emailService = new MockEmailService();

            const mock = sinon.mock(emailService);

            mock.expects('send').never();

            const job = new MentionEmailReportJob({
                mentionReportGenerator: new MockMentionReportGenerator([]),
                mentionReportRecipientRepository: new MockMentionReportRecipientRepository(),
                mentionReportEmailView: new MockMentionReportEmailView(),
                mentionReportHistoryService: new MockMentionReportHistoryService(new Date(0)),
                emailService: emailService
            });

            await job.sendLatestReport();

            mock.verify();
        });

        it('Does not send an email if the last email was sent within 24 hours', async function () {
            const emailService = new MockEmailService();

            const mock = sinon.mock(emailService);

            mock.expects('send').never();

            const job = new MentionEmailReportJob({
                mentionReportGenerator: new MockMentionReportGenerator([{
                    target: new URL('https://target.com'),
                    source: new URL('https://source.com'),
                    sourceTitle: 'Source Title',
                    sourceExcerpt: 'Source Excerpt',
                    sourceSiteTitle: 'Source Site Title',
                    sourceFavicon: new URL('https://source.com/favicon.ico'),
                    sourceAuthor: 'Source Author',
                    sourceFeaturedImage: new URL('https://source.com/featured-image.jpg')
                }]),
                mentionReportRecipientRepository: new MockMentionReportRecipientRepository(),
                mentionReportEmailView: new MockMentionReportEmailView(),
                mentionReportHistoryService: new MockMentionReportHistoryService(new Date()),
                emailService: emailService
            });

            await job.sendLatestReport();

            mock.verify();
        });

        it('Sends an email if the last email was sent more than 24 hours ago', async function () {
            const emailService = new MockEmailService();

            const mock = sinon.mock(emailService);

            mock.expects('send').once().alwaysCalledWith(
                'fake@email.address',
                'Mention Report',
                '<h1>Mention Report</h1>',
                'Mention Report'
            );

            const job = new MentionEmailReportJob({
                mentionReportGenerator: new MockMentionReportGenerator([{
                    target: new URL('https://target.com'),
                    source: new URL('https://source.com'),
                    sourceTitle: 'Source Title',
                    sourceExcerpt: 'Source Excerpt',
                    sourceSiteTitle: 'Source Site Title',
                    sourceFavicon: new URL('https://source.com/favicon.ico'),
                    sourceAuthor: 'Source Author',
                    sourceFeaturedImage: new URL('https://source.com/featured-image.jpg')
                }]),
                mentionReportRecipientRepository: new MockMentionReportRecipientRepository(),
                mentionReportEmailView: new MockMentionReportEmailView(),
                mentionReportHistoryService: new MockMentionReportHistoryService(new Date(0)),
                emailService
            });

            await job.sendLatestReport();

            mock.verify();
        });
    });
});
