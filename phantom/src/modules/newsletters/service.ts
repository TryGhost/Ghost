import {randomUUID} from 'node:crypto';
import type {NewsletterRepository} from './repo.js';
import type {
    AutomatedEmailRequest,
    AutomatedEmailResponse,
    BatchRetryRequest,
    BatchRetryResponse,
    IssueSendRequest,
    IssueSendResponse,
    IssueDeliveryUpdateRequest,
    IssueDeliveryUpdateResponse,
    IssueCreateRequest,
    IssueCreateResponse,
    NewsletterCreateRequest,
    NewsletterCreateResponse,
    SuppressionCreateRequest,
    SuppressionCreateResponse
} from './contracts.js';
import {HttpError} from '../../platform/http/errors.js';

export type NewsletterService = {
    createNewsletter: (input: NewsletterCreateRequest) => Promise<NewsletterCreateResponse>;
    createIssue: (input: IssueCreateRequest) => Promise<IssueCreateResponse>;
    recordDeliveryStatus: (input: IssueDeliveryUpdateRequest) => Promise<IssueDeliveryUpdateResponse>;
    createSuppression: (input: SuppressionCreateRequest) => Promise<SuppressionCreateResponse>;
    deleteSuppression: (id: string) => Promise<void>;
    queueAutomatedEmail: (input: AutomatedEmailRequest) => Promise<AutomatedEmailResponse>;
    sendIssue: (input: IssueSendRequest) => Promise<IssueSendResponse>;
    retryBatch: (input: BatchRetryRequest) => Promise<BatchRetryResponse>;
};

const defaultBatchSize = 500;
const defaultBatchAttempts = 3;
const tokenPattern = /{{\s*member\.(name|first_name|email)\s*}}/g;

type RecipientInput = {
    memberId: string;
    email: string;
    name: string | undefined;
    isPaid: boolean;
};

type ResolvedSender = {
    senderEmail: string;
    replyToEmail: string;
    supportEmail: string;
    senderName: string;
};

const resolveSender = (input: IssueSendRequest['sender']): ResolvedSender => {
    const senderEmail = input.senderEmail;
    const senderDomain = senderEmail.split('@')[1] ?? '';
    const supportEmail = input.supportEmail && input.supportEmail.endsWith(`@${senderDomain}`)
        ? input.supportEmail
        : senderEmail;
    const replyToEmail = input.replyToEmail && input.replyToEmail.endsWith(`@${senderDomain}`)
        ? input.replyToEmail
        : supportEmail;
    const senderName = input.senderName ?? input.siteTitle;

    return {
        senderEmail,
        replyToEmail,
        supportEmail,
        senderName
    };
};

const resolveWarmup = (input: IssueSendRequest) => {
    const senderDomain = input.sender.senderEmail.split('@')[1] ?? 'ghost.local';
    const warmup = input.warmup;
    if (!warmup) {
        return {
            primaryDomain: senderDomain,
            primaryLimit: input.recipients.length,
            fallbackDomain: senderDomain,
            fallbackLimit: 0
        };
    }

    const ramp = warmup.sameDay ? 0 : warmup.dailyRamp ?? 0;
    const primaryLimit = Math.max(1, warmup.limit + ramp);
    const fallbackDomain = warmup.fallbackDomain ?? senderDomain;
    const fallbackLimit = warmup.fallbackLimit ?? primaryLimit;
    return {
        primaryDomain: senderDomain,
        primaryLimit,
        fallbackDomain,
        fallbackLimit
    };
};

const personalizeSubject = (subject: string, recipient: RecipientInput) => {
    const firstName = recipient.name?.split(' ')[0] ?? '';
    return subject.replace(tokenPattern, (_match, token) => {
        switch (token) {
            case 'name':
                return recipient.name ?? recipient.email;
            case 'first_name':
                return firstName || recipient.name || recipient.email;
            case 'email':
                return recipient.email;
            default:
                return recipient.email;
        }
    });
};

const normalizeBatchStatus = (status: string): 'pending' | 'sending' | 'sent' | 'failed' => {
    switch (status) {
        case 'sent':
            return 'sent';
        case 'sending':
            return 'sending';
        case 'failed':
            return 'failed';
        default:
            return 'pending';
    }
};

const normalizeBatchSegment = (segment: string): 'all' | 'paid' | 'free' => {
    switch (segment) {
        case 'paid':
            return 'paid';
        case 'free':
            return 'free';
        default:
            return 'all';
    }
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

    const recordDeliveryStatus = async (input: IssueDeliveryUpdateRequest) => {
        const issue = await repository.getIssueById(input.issueId);
        if (!issue) {
            throw new HttpError(404, 'issue_not_found', 'Issue not found');
        }

        const existing = await repository.getDeliveryByIssueAndMember(input.issueId, input.memberId);
        const now = Date.now();
        const delivery = await repository.upsertDelivery({
            id: existing?.id ?? randomUUID(),
            issueId: input.issueId,
            memberId: input.memberId,
            status: input.status,
            error: input.error ?? null,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        });

        const eventType = input.status === 'opened'
            ? 'opened'
            : input.status === 'failed'
                ? 'failed'
                : 'delivered';
        await repository.createEmailEvent({
            id: randomUUID(),
            issueId: input.issueId,
            memberId: input.memberId,
            type: eventType,
            payload: JSON.stringify({error: input.error ?? null}),
            createdAt: now
        });

        const status: 'pending' | 'sent' | 'failed' | 'opened' = delivery.status === 'opened'
            ? 'opened'
            : delivery.status === 'failed'
                ? 'failed'
                : delivery.status === 'sent'
                    ? 'sent'
                    : 'pending';

        return {
            delivery: {
                id: delivery.id,
                issueId: delivery.issueId,
                memberId: delivery.memberId,
                status,
                error: delivery.error ?? null,
                updatedAt: delivery.updatedAt
            }
        };
    };

    const createSuppression = async (input: SuppressionCreateRequest) => {
        const existing = await repository.getSuppressionByMember(input.memberId);
        if (existing) {
            const source: 'manual' | 'provider' | 'system' = existing.source === 'provider'
                ? 'provider'
                : existing.source === 'system'
                    ? 'system'
                    : 'manual';
            return {
                suppression: {
                    id: existing.id,
                    memberId: existing.memberId,
                    reason: existing.reason,
                    source,
                    createdAt: existing.createdAt
                }
            };
        }

        const now = Date.now();
        const suppression = await repository.createSuppression({
            id: randomUUID(),
            memberId: input.memberId,
            reason: input.reason,
            source: input.source ?? 'manual',
            createdAt: now
        });

        const source: 'manual' | 'provider' | 'system' = suppression.source === 'provider'
            ? 'provider'
            : suppression.source === 'system'
                ? 'system'
                : 'manual';
        return {
            suppression: {
                id: suppression.id,
                memberId: suppression.memberId,
                reason: suppression.reason,
                source,
                createdAt: suppression.createdAt
            }
        };
    };

    const deleteSuppression = async (id: string) => {
        await repository.deleteSuppression(id);
    };

    const queueAutomatedEmail = async (input: AutomatedEmailRequest) => {
        const suppressed = await repository.getSuppressionByMember(input.memberId);
        if (suppressed) {
            throw new HttpError(409, 'member_suppressed', 'Member is suppressed');
        }

        const now = Date.now();
        await repository.createAutomatedEmail({
            id: randomUUID(),
            memberId: input.memberId,
            type: input.type,
            status: 'queued',
            error: null,
            createdAt: now
        });

        const event = await repository.createEmailEvent({
            id: randomUUID(),
            issueId: null,
            memberId: input.memberId,
            type: 'delivered',
            payload: JSON.stringify({type: input.type}),
            createdAt: now
        });

        const type: 'delivered' | 'opened' | 'failed' = event.type === 'opened'
            ? 'opened'
            : event.type === 'failed'
                ? 'failed'
                : 'delivered';
        return {
            event: {
                id: event.id,
                issueId: event.issueId ?? null,
                memberId: event.memberId ?? null,
                type,
                createdAt: event.createdAt
            }
        };
    };

    const sendIssue = async (input: IssueSendRequest) => {
        const issue = await repository.getIssueById(input.issueId);
        if (!issue) {
            throw new HttpError(404, 'issue_not_found', 'Issue not found');
        }

        const existingBatches = await repository.listBatchesForIssue(input.issueId);
        const hasActiveBatch = existingBatches.some((batch) => batch.status === 'pending' || batch.status === 'sending');
        if (hasActiveBatch) {
            throw new HttpError(409, 'issue_send_in_progress', 'Issue already sending');
        }

        const uniqueRecipients = new Map<string, RecipientInput>();
        for (const recipient of input.recipients) {
            if (!uniqueRecipients.has(recipient.memberId)) {
                uniqueRecipients.set(recipient.memberId, {
                    ...recipient,
                    name: recipient.name
                });
            }
        }

        const recipients = Array.from(uniqueRecipients.values());
        const segments: Array<{segment: 'all' | 'paid' | 'free'; recipients: RecipientInput[]}> = [];
        if (input.segmentPaidContent) {
            segments.push({segment: 'paid', recipients: recipients.filter((recipient) => recipient.isPaid)});
            segments.push({segment: 'free', recipients: recipients.filter((recipient) => !recipient.isPaid)});
        } else {
            segments.push({segment: 'all', recipients});
        }

        const sender = resolveSender(input.sender);
        const warmup = resolveWarmup(input);
        const batchSize = input.batchSize ?? defaultBatchSize;
        const now = Date.now();
        const batches = [] as IssueSendResponse['batches'];

        for (const segment of segments) {
            if (segment.recipients.length === 0) {
                continue;
            }

            const primaryRecipients = segment.recipients.slice(0, warmup.primaryLimit);
            const fallbackRecipients = segment.recipients.slice(primaryRecipients.length, primaryRecipients.length + warmup.fallbackLimit);
            const recipientGroups = [
                {domain: warmup.primaryDomain, recipients: primaryRecipients, limit: warmup.primaryLimit},
                {domain: warmup.fallbackDomain, recipients: fallbackRecipients, limit: warmup.fallbackLimit}
            ].filter((group) => group.recipients.length > 0);

            for (const group of recipientGroups) {
                for (let index = 0; index < group.recipients.length; index += batchSize) {
                    const slice = group.recipients.slice(index, index + batchSize);
                    const batchId = randomUUID();
                    const batch = await repository.createEmailBatch({
                        id: batchId,
                        issueId: input.issueId,
                        segment: segment.segment,
                        status: 'pending',
                        batchSize: slice.length,
                        attempt: 0,
                        maxAttempts: defaultBatchAttempts,
                        nextAttemptAt: now,
                        senderEmail: sender.senderEmail,
                        replyToEmail: sender.replyToEmail,
                        supportEmail: sender.supportEmail,
                        senderName: sender.senderName,
                        trackingEnabled: input.trackingEnabled === false ? 0 : 1,
                        outboundTaggingEnabled: input.outboundTaggingEnabled === false ? 0 : 1,
                        includeCommentCta: input.includeCommentCta ? 1 : 0,
                        warmupDomain: group.domain,
                        warmupLimit: group.limit,
                        lastError: null,
                        createdAt: now,
                        updatedAt: now
                    });

                    await repository.createBatchRecipients(slice.map((recipient) => ({
                        id: randomUUID(),
                        batchId,
                        memberId: recipient.memberId,
                        status: 'pending',
                        personalizedSubject: personalizeSubject(input.subject, recipient),
                        createdAt: now,
                        updatedAt: now
                    })));

                    batches.push({
                        id: batch.id,
                        issueId: batch.issueId,
                        segment: normalizeBatchSegment(batch.segment),
                        status: normalizeBatchStatus(batch.status),
                        batchSize: batch.batchSize,
                        attempt: batch.attempt,
                        maxAttempts: batch.maxAttempts,
                        nextAttemptAt: batch.nextAttemptAt,
                        warmupDomain: batch.warmupDomain,
                        warmupLimit: batch.warmupLimit,
                        updatedAt: batch.updatedAt
                    });
                }
            }
        }

        return {batches};
    };

    const retryBatch = async (input: BatchRetryRequest) => {
        const batch = await repository.getBatchById(input.batchId);
        if (!batch) {
            throw new HttpError(404, 'batch_not_found', 'Batch not found');
        }
        if (batch.status === 'sending' || batch.status === 'pending') {
            throw new HttpError(409, 'batch_active', 'Batch already in progress');
        }

        const issueBatches = await repository.listBatchesForIssue(batch.issueId);
        const hasActive = issueBatches.some((entry) => entry.status === 'sending' || entry.status === 'pending');
        if (hasActive) {
            throw new HttpError(409, 'issue_send_in_progress', 'Issue already sending');
        }

        const nextAttempt = batch.attempt + 1;
        if (nextAttempt > batch.maxAttempts) {
            throw new HttpError(422, 'batch_max_attempts', 'Batch has exceeded retries');
        }

        const now = Date.now();
        const updated = await repository.updateEmailBatch({
            ...batch,
            status: 'pending',
            attempt: nextAttempt,
            nextAttemptAt: now,
            lastError: null,
            updatedAt: now
        });

        return {
            batch: {
                id: updated.id,
                issueId: updated.issueId,
                segment: normalizeBatchSegment(updated.segment),
                status: normalizeBatchStatus(updated.status),
                batchSize: updated.batchSize,
                attempt: updated.attempt,
                maxAttempts: updated.maxAttempts,
                nextAttemptAt: updated.nextAttemptAt,
                warmupDomain: updated.warmupDomain,
                warmupLimit: updated.warmupLimit,
                updatedAt: updated.updatedAt
            }
        };
    };

    return {
        createNewsletter,
        createIssue,
        recordDeliveryStatus,
        createSuppression,
        deleteSuppression,
        queueAutomatedEmail,
        sendIssue,
        retryBatch
    };
};
