import {describe, expect, it} from 'vitest';
import {createNewsletterService} from './service.js';
import type {NewsletterRepository} from './repo.js';
import type {NewsletterRecord} from './db.js';
import {HttpError} from '../../platform/http/errors.js';

const createRepository = (): NewsletterRepository => {
    const newsletters: NewsletterRecord[] = [];
    const issues: {id: string; newsletterId: string; subject: string; status: string; sendAt: number | null; createdAt: number; updatedAt: number}[] = [];
    const jobs: {id: string}[] = [];

    return {
        createNewsletter: async (newsletter) => {
            const record = newsletter as NewsletterRecord;
            newsletters.push(record);
            return record;
        },
        getNewsletterById: async (id) => newsletters.find((newsletter) => newsletter.id === id) ?? null,
        listNewsletters: async () => newsletters,
        createIssue: async (issue) => {
            const record = issue as {id: string; newsletterId: string; subject: string; status: string; sendAt: number | null; createdAt: number; updatedAt: number};
            issues.push(record);
            return record;
        },
        getIssueById: async (id) => issues.find((issue) => issue.id === id) ?? null,
        createDeliveryJob: async (job) => {
            const record = job as {id: string; issueId: string; status: string; createdAt: number};
            jobs.push(record);
            return record;
        },
        getDeliveryByIssueAndMember: async () => null,
        upsertDelivery: async () => {
            throw new Error('Not implemented');
        },
        createSuppression: async () => {
            throw new Error('Not implemented');
        },
        getSuppressionByMember: async () => null,
        deleteSuppression: async () => undefined,
        createEmailEvent: async () => {
            throw new Error('Not implemented');
        },
        createAutomatedEmail: async () => {
            throw new Error('Not implemented');
        },
        listAutomatedEmailsByMember: async () => [],
        upsertNewsletterMembership: async () => {
            throw new Error('Not implemented');
        },
        getNewsletterMembership: async () => null,
        createEmailTemplate: async () => {
            throw new Error('Not implemented');
        },
        getEmailTemplateByType: async () => null,
        createEmailBatch: async () => {
            throw new Error('Not implemented');
        },
        listBatchesForIssue: async () => [],
        getBatchById: async () => null,
        updateEmailBatch: async () => {
            throw new Error('Not implemented');
        },
        createBatchRecipients: async () => {
            throw new Error('Not implemented');
        },
        listBatchRecipients: async () => []
    };
};

describe('newsletter service', () => {
    it('creates newsletters and issues', async () => {
        const repository = createRepository();
        const service = createNewsletterService(repository);

        const newsletter = await service.createNewsletter({name: 'Weekly', senderEmail: 'hello@example.com'});
        const issue = await service.createIssue({newsletterId: newsletter.newsletter.id, subject: 'Welcome'});

        expect(issue.issue.status).toBe('draft');
    });

    it('requires existing newsletters', async () => {
        const repository = createRepository();
        const service = createNewsletterService(repository);

        let error: HttpError | null = null;

        try {
            await service.createIssue({newsletterId: 'missing', subject: 'Missing'});
        } catch (caught) {
            if (caught instanceof HttpError) {
                error = caught;
            }
        }

        expect(error?.status).toBe(404);
    });
});
