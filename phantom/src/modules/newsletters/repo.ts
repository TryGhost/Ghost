import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    deliveryJobTable,
    issueTable,
    newsletterTable,
    type DeliveryJobRecord,
    type IssueRecord,
    type NewDeliveryJobRecord,
    type NewIssueRecord,
    type NewNewsletterRecord,
    type NewsletterRecord
} from './db.js';

export type NewsletterRepository = {
    createNewsletter: (newsletter: NewNewsletterRecord) => Promise<NewsletterRecord>;
    getNewsletterById: (id: string) => Promise<NewsletterRecord | null>;
    createIssue: (issue: NewIssueRecord) => Promise<IssueRecord>;
    getIssueById: (id: string) => Promise<IssueRecord | null>;
    createDeliveryJob: (job: NewDeliveryJobRecord) => Promise<DeliveryJobRecord>;
};

export const createNewsletterRepository = (db: DbClient): NewsletterRepository => {
    const createNewsletter = async (newsletter: NewNewsletterRecord) => {
        await db.insert(newsletterTable).values(newsletter);
        const rows = await db.select().from(newsletterTable).where(eq(newsletterTable.id, newsletter.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Newsletter missing after insert');
        }
        return rows[0];
    };

    const getNewsletterById = async (id: string) => {
        const rows = await db.select().from(newsletterTable).where(eq(newsletterTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createIssue = async (issue: NewIssueRecord) => {
        await db.insert(issueTable).values(issue);
        const rows = await db.select().from(issueTable).where(eq(issueTable.id, issue.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Issue missing after insert');
        }
        return rows[0];
    };

    const getIssueById = async (id: string) => {
        const rows = await db.select().from(issueTable).where(eq(issueTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createDeliveryJob = async (job: NewDeliveryJobRecord) => {
        await db.insert(deliveryJobTable).values(job);
        const rows = await db.select().from(deliveryJobTable).where(eq(deliveryJobTable.id, job.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Delivery job missing after insert');
        }
        return rows[0];
    };

    return {
        createNewsletter,
        getNewsletterById,
        createIssue,
        getIssueById,
        createDeliveryJob
    };
};
