import {randomUUID} from 'node:crypto';
import type {NewsletterRepository} from './repo.js';
import type {
    IssueCreateRequest,
    IssueCreateResponse,
    NewsletterCreateRequest,
    NewsletterCreateResponse
} from './contracts.js';
import {HttpError} from '../../platform/http/errors.js';

export type NewsletterService = {
    createNewsletter: (input: NewsletterCreateRequest) => Promise<NewsletterCreateResponse>;
    createIssue: (input: IssueCreateRequest) => Promise<IssueCreateResponse>;
};

export const createNewsletterService = (repository: NewsletterRepository): NewsletterService => {
    const createNewsletter = async (input: NewsletterCreateRequest) => {
        const now = Date.now();
        const newsletter = await repository.createNewsletter({
            id: randomUUID(),
            name: input.name,
            senderEmail: input.senderEmail,
            createdAt: now,
            updatedAt: now
        });

        return {
            newsletter: {
                id: newsletter.id,
                name: newsletter.name,
                senderEmail: newsletter.senderEmail,
                createdAt: newsletter.createdAt,
                updatedAt: newsletter.updatedAt
            }
        };
    };

    const createIssue = async (input: IssueCreateRequest) => {
        const newsletter = await repository.getNewsletterById(input.newsletterId);
        if (!newsletter) {
            throw new HttpError(404, 'newsletter_not_found', 'Newsletter not found');
        }

        const now = Date.now();
        const status: 'scheduled' | 'draft' = input.sendAt ? 'scheduled' : 'draft';
        const issue = await repository.createIssue({
            id: randomUUID(),
            newsletterId: input.newsletterId,
            subject: input.subject,
            status,
            sendAt: input.sendAt ?? null,
            createdAt: now,
            updatedAt: now
        });

        if (status === 'scheduled') {
            await repository.createDeliveryJob({
                id: randomUUID(),
                issueId: issue.id,
                status: 'queued',
                createdAt: now
            });
        }

        const responseStatus: 'draft' | 'scheduled' | 'sent' = issue.status === 'sent'
            ? 'sent'
            : issue.status === 'scheduled'
                ? 'scheduled'
                : 'draft';

        return {
            issue: {
                id: issue.id,
                newsletterId: issue.newsletterId,
                subject: issue.subject,
                status: responseStatus,
                sendAt: issue.sendAt ?? null
            }
        };
    };

    return {
        createNewsletter,
        createIssue
    };
};
