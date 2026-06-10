import {and, eq, inArray} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    automatedEmailTable,
    deliveryJobTable,
    emailEventTable,
    emailBatchRecipientTable,
    emailBatchTable,
    emailTemplateTable,
    issueTable,
    issueDeliveryTable,
    newsletterTable,
    newsletterMembershipTable,
    suppressionTable,
    type DeliveryJobRecord,
    type EmailEventRecord,
    type EmailBatchRecord,
    type EmailBatchRecipientRecord,
    type EmailTemplateRecord,
    type IssueRecord,
    type IssueDeliveryRecord,
    type SuppressionRecord,
    type AutomatedEmailRecord,
    type NewDeliveryJobRecord,
    type NewEmailEventRecord,
    type NewEmailBatchRecord,
    type NewEmailBatchRecipientRecord,
    type NewEmailTemplateRecord,
    type NewIssueRecord,
    type NewIssueDeliveryRecord,
    type NewNewsletterRecord,
    type NewNewsletterMembershipRecord,
    type NewSuppressionRecord,
    type NewAutomatedEmailRecord,
    type NewsletterRecord,
    type NewsletterMembershipRecord
} from './db.js';

export type NewsletterRepository = {
    createNewsletter: (newsletter: NewNewsletterRecord) => Promise<NewsletterRecord>;
    getNewsletterById: (id: string) => Promise<NewsletterRecord | null>;
    listNewsletters: () => Promise<NewsletterRecord[]>;
    createIssue: (issue: NewIssueRecord) => Promise<IssueRecord>;
    getIssueById: (id: string) => Promise<IssueRecord | null>;
    createDeliveryJob: (job: NewDeliveryJobRecord) => Promise<DeliveryJobRecord>;
    getDeliveryByIssueAndMember: (issueId: string, memberId: string) => Promise<IssueDeliveryRecord | null>;
    upsertDelivery: (delivery: NewIssueDeliveryRecord) => Promise<IssueDeliveryRecord>;
    createSuppression: (suppression: NewSuppressionRecord) => Promise<SuppressionRecord>;
    getSuppressionByMember: (memberId: string) => Promise<SuppressionRecord | null>;
    deleteSuppression: (id: string) => Promise<void>;
    createEmailEvent: (event: NewEmailEventRecord) => Promise<EmailEventRecord>;
    createAutomatedEmail: (record: NewAutomatedEmailRecord) => Promise<AutomatedEmailRecord>;
    listAutomatedEmailsByMember: (memberId: string, type: string) => Promise<AutomatedEmailRecord[]>;
    upsertNewsletterMembership: (membership: NewNewsletterMembershipRecord) => Promise<NewsletterMembershipRecord>;
    getNewsletterMembership: (newsletterId: string, memberId: string) => Promise<NewsletterMembershipRecord | null>;
    createEmailTemplate: (template: NewEmailTemplateRecord) => Promise<EmailTemplateRecord>;
    getEmailTemplateByType: (type: string) => Promise<EmailTemplateRecord | null>;
    createEmailBatch: (batch: NewEmailBatchRecord) => Promise<EmailBatchRecord>;
    listBatchesForIssue: (issueId: string) => Promise<EmailBatchRecord[]>;
    getBatchById: (id: string) => Promise<EmailBatchRecord | null>;
    updateEmailBatch: (batch: EmailBatchRecord) => Promise<EmailBatchRecord>;
    createBatchRecipients: (recipients: NewEmailBatchRecipientRecord[]) => Promise<EmailBatchRecipientRecord[]>;
    listBatchRecipients: (batchId: string) => Promise<EmailBatchRecipientRecord[]>;
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

    const listNewsletters = async () => {
        return db.select().from(newsletterTable);
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

    const getDeliveryByIssueAndMember = async (issueId: string, memberId: string) => {
        const rows = await db
            .select()
            .from(issueDeliveryTable)
            .where(and(
                eq(issueDeliveryTable.issueId, issueId),
                eq(issueDeliveryTable.memberId, memberId)
            ))
            .limit(1);
        return rows[0] ?? null;
    };

    const upsertDelivery = async (delivery: NewIssueDeliveryRecord) => {
        await db
            .insert(issueDeliveryTable)
            .values(delivery)
            .onConflictDoUpdate({
                target: issueDeliveryTable.id,
                set: {
                    status: delivery.status,
                    error: delivery.error,
                    updatedAt: delivery.updatedAt
                }
            });
        const rows = await db.select().from(issueDeliveryTable).where(eq(issueDeliveryTable.id, delivery.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Delivery record missing after upsert');
        }
        return rows[0];
    };

    const createSuppression = async (suppression: NewSuppressionRecord) => {
        await db.insert(suppressionTable).values(suppression);
        const rows = await db.select().from(suppressionTable).where(eq(suppressionTable.id, suppression.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Suppression missing after insert');
        }
        return rows[0];
    };

    const getSuppressionByMember = async (memberId: string) => {
        const rows = await db.select().from(suppressionTable).where(eq(suppressionTable.memberId, memberId)).limit(1);
        return rows[0] ?? null;
    };

    const deleteSuppression = async (id: string) => {
        await db.delete(suppressionTable).where(eq(suppressionTable.id, id));
    };

    const createEmailEvent = async (event: NewEmailEventRecord) => {
        await db.insert(emailEventTable).values(event);
        const rows = await db.select().from(emailEventTable).where(eq(emailEventTable.id, event.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Email event missing after insert');
        }
        return rows[0];
    };

    const createAutomatedEmail = async (record: NewAutomatedEmailRecord) => {
        await db.insert(automatedEmailTable).values(record);
        const rows = await db.select().from(automatedEmailTable).where(eq(automatedEmailTable.id, record.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Automated email missing after insert');
        }
        return rows[0];
    };

    const listAutomatedEmailsByMember = async (memberId: string, type: string) => {
        return db
            .select()
            .from(automatedEmailTable)
            .where(and(eq(automatedEmailTable.memberId, memberId), eq(automatedEmailTable.type, type)));
    };

    const upsertNewsletterMembership = async (membership: NewNewsletterMembershipRecord) => {
        await db
            .insert(newsletterMembershipTable)
            .values(membership)
            .onConflictDoUpdate({
                target: newsletterMembershipTable.id,
                set: {
                    status: membership.status,
                    updatedAt: membership.updatedAt
                }
            });
        const rows = await db
            .select()
            .from(newsletterMembershipTable)
            .where(eq(newsletterMembershipTable.id, membership.id))
            .limit(1);
        if (!rows[0]) {
            throw new Error('Newsletter membership missing after upsert');
        }
        return rows[0];
    };

    const getNewsletterMembership = async (newsletterId: string, memberId: string) => {
        const rows = await db
            .select()
            .from(newsletterMembershipTable)
            .where(and(eq(newsletterMembershipTable.newsletterId, newsletterId), eq(newsletterMembershipTable.memberId, memberId)))
            .limit(1);
        return rows[0] ?? null;
    };

    const createEmailTemplate = async (template: NewEmailTemplateRecord) => {
        await db.insert(emailTemplateTable).values(template);
        const rows = await db.select().from(emailTemplateTable).where(eq(emailTemplateTable.id, template.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Email template missing after insert');
        }
        return rows[0];
    };

    const getEmailTemplateByType = async (type: string) => {
        const rows = await db.select().from(emailTemplateTable).where(eq(emailTemplateTable.type, type)).limit(1);
        return rows[0] ?? null;
    };

    const createEmailBatch = async (batch: NewEmailBatchRecord) => {
        await db.insert(emailBatchTable).values(batch);
        const rows = await db.select().from(emailBatchTable).where(eq(emailBatchTable.id, batch.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Email batch missing after insert');
        }
        return rows[0];
    };

    const listBatchesForIssue = async (issueId: string) => {
        return db.select().from(emailBatchTable).where(eq(emailBatchTable.issueId, issueId));
    };

    const getBatchById = async (id: string) => {
        const rows = await db.select().from(emailBatchTable).where(eq(emailBatchTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const updateEmailBatch = async (batch: EmailBatchRecord) => {
        await db
            .update(emailBatchTable)
            .set({
                status: batch.status,
                attempt: batch.attempt,
                maxAttempts: batch.maxAttempts,
                nextAttemptAt: batch.nextAttemptAt,
                lastError: batch.lastError,
                updatedAt: batch.updatedAt
            })
            .where(eq(emailBatchTable.id, batch.id));
        const rows = await db.select().from(emailBatchTable).where(eq(emailBatchTable.id, batch.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Email batch missing after update');
        }
        return rows[0];
    };

    const createBatchRecipients = async (recipients: NewEmailBatchRecipientRecord[]) => {
        if (recipients.length === 0) {
            return [];
        }
        await db.insert(emailBatchRecipientTable).values(recipients);
        const ids = recipients.map((recipient) => recipient.id);
        return db.select().from(emailBatchRecipientTable).where(inArray(emailBatchRecipientTable.id, ids));
    };

    const listBatchRecipients = async (batchId: string) => {
        return db.select().from(emailBatchRecipientTable).where(eq(emailBatchRecipientTable.batchId, batchId));
    };

    return {
        createNewsletter,
        listNewsletters,
        getNewsletterById,
        createIssue,
        getIssueById,
        createDeliveryJob,
        getDeliveryByIssueAndMember,
        upsertDelivery,
        createSuppression,
        getSuppressionByMember,
        deleteSuppression,
        createEmailEvent,
        createAutomatedEmail,
        listAutomatedEmailsByMember,
        upsertNewsletterMembership,
        getNewsletterMembership,
        createEmailTemplate,
        getEmailTemplateByType,
        createEmailBatch,
        listBatchesForIssue,
        getBatchById,
        updateEmailBatch,
        createBatchRecipients,
        listBatchRecipients
    };
};
