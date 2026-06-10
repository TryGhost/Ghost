import {randomUUID} from 'node:crypto';
import type {
    ExportRequest,
    ExportResponse,
    FixtureResponse,
    ImportRequest,
    ImportResponse,
    MailgunEventRequest,
    MailgunEventResponse,
    MetricsConfigRequest,
    MetricsConfigResponse,
    MigrationRequest,
    MigrationResponse,
    NullableMigrationRequest,
    NullableMigrationResponse,
    OutboxProcessResponse,
    TokenCleanupResponse,
    UpdateCheckResponse,
    UrlGenerateRequest,
    UrlGenerateResponse,
    WelcomeEmailRequest,
    WelcomeEmailResponse
} from './contracts.js';
import type {OperationsRepository} from './repo.js';
import type {NewsletterRepository} from '../newsletters/repo.js';
import type {StaffRepository} from '../identity/repo.js';
import type {MemberRepository} from '../members/repo.js';
import type {ContentRepository} from '../content/repo.js';
import type {WebhookRepository} from '../webhooks/repo.js';
import type {AnalyticsRepository} from '../analytics/repo.js';
import type {MetricsClient} from '../../platform/metrics/client.js';
import type {GhostImporter} from './importer.js';

export type OperationsService = {
    exportData: (input: ExportRequest) => Promise<ExportResponse>;
    importData: (input: ImportRequest) => Promise<ImportResponse>;
    runMigration: (input: MigrationRequest) => Promise<MigrationResponse>;
    seedFixtures: () => Promise<FixtureResponse>;
    toggleNullableMigration: (input: NullableMigrationRequest) => Promise<NullableMigrationResponse>;
    generateUrl: (input: UrlGenerateRequest) => Promise<UrlGenerateResponse>;
    recordMailgunEvent: (input: MailgunEventRequest) => Promise<MailgunEventResponse>;
    queueWelcomeEmail: (input: WelcomeEmailRequest) => Promise<WelcomeEmailResponse>;
    runUpdateCheck: () => Promise<UpdateCheckResponse>;
    cleanupTokens: () => Promise<TokenCleanupResponse>;
    updateMetricsConfig: (input: MetricsConfigRequest) => Promise<MetricsConfigResponse>;
    processOutbox: () => Promise<OutboxProcessResponse>;
};

const exportTables = [
    'posts',
    'post_revisions',
    'tags',
    'members',
    'subscriptions',
    'newsletters'
];

export const createOperationsService = (
    repository: OperationsRepository,
    newsletterRepository: NewsletterRepository,
    staffRepository: StaffRepository,
    memberRepository: MemberRepository,
    contentRepository: ContentRepository,
    webhookRepository: WebhookRepository,
    analyticsRepository?: AnalyticsRepository,
    metricsClient?: MetricsClient,
    ghostImporter?: GhostImporter
): OperationsService => {
    const exportData = async (_input: ExportRequest) => {
        const exportedAt = Date.now();
        const job = await repository.createExportJob({
            id: randomUUID(),
            status: 'completed',
            tables: JSON.stringify(exportTables),
            createdAt: exportedAt
        });

        return {
            exportId: job.id,
            tables: exportTables,
            meta: {
                exportedAt,
                version: process.env.GHOST_VERSION ?? 'v4'
            }
        };
    };

    const importData = async (input: ImportRequest) => {
        if (!ghostImporter) {
            const job = await repository.createImportJob({
                id: randomUUID(),
                format: input.format,
                status: 'queued',
                createdAt: Date.now()
            });
            return {
                importId: job.id,
                status: 'queued' as const
            };
        }

        const counts = await ghostImporter.importExport(input.payload);
        const job = await repository.createImportJob({
            id: randomUUID(),
            format: input.format,
            status: 'completed',
            createdAt: Date.now()
        });

        return {
            importId: job.id,
            status: 'completed' as const,
            counts: counts as unknown as Record<string, number>
        };
    };

    const runMigration = async (input: MigrationRequest) => {
        const existing = await repository.getMigrationRun(input.version, input.action);
        if (existing) {
            const status: MigrationResponse['status'] = existing.status === 'completed' ? 'completed' : 'failed';
            return {
                runId: existing.id,
                status
            };
        }

        const run = await repository.createMigrationRun({
            id: randomUUID(),
            version: input.version,
            action: input.action,
            status: 'completed',
            createdAt: Date.now()
        });

        const status: MigrationResponse['status'] = run.status === 'completed' ? 'completed' : 'failed';
        return {
            runId: run.id,
            status
        };
    };

    const seedFixtures = async () => {
        const now = Date.now();
        const roles = ['admin', 'editor', 'author', 'contributor'];
        for (const roleName of roles) {
            const existing = await staffRepository.getRoleByName(roleName);
            if (!existing) {
                await staffRepository.createRole({id: randomUUID(), name: roleName});
            }
        }

        const existingTemplate = await newsletterRepository.getEmailTemplateByType('welcome');
        if (!existingTemplate) {
            await newsletterRepository.createEmailTemplate({
                id: randomUUID(),
                type: 'welcome',
                status: 'active',
                createdAt: now,
                updatedAt: now
            });
        }

        await contentRepository.createCollection({
            id: randomUUID(),
            name: 'Home',
            slug: 'home',
            filter: 'featured:true'
        });

        await contentRepository.createPost({
            id: randomUUID(),
            title: 'Welcome to Ghost',
            slug: 'welcome',
            status: 'draft',
            lexical: JSON.stringify({root: {children: [], type: 'root'}}),
            publishedAt: null,
            createdAt: now,
            updatedAt: now
        });

        const run = await repository.createFixtureRun({
            id: 'fixtures',
            status: 'completed',
            createdAt: now
        });

        const status: FixtureResponse['status'] = run.status === 'completed' ? 'completed' : 'failed';

        return {
            runId: run.id,
            status,
            createdAt: run.createdAt
        };
    };

    const toggleNullableMigration = async (input: NullableMigrationRequest) => {
        const now = Date.now();
        const migration = await repository.createNullableMigration({
            id: randomUUID(),
            tableName: input.table,
            columnName: input.column,
            nullable: input.nullable ? 1 : 0,
            disableForeignKeys: input.disableForeignKeys ? 1 : 0,
            preserveDefaults: input.preserveDefaults ? 1 : 0,
            createdAt: now
        });

        return {
            migrationId: migration.id,
            nullable: migration.nullable === 1,
            createdAt: migration.createdAt
        };
    };

    const generateUrl = async (input: UrlGenerateRequest) => {
        if (input.hasContent === false) {
            return {url: null};
        }

        const base = input.subdirectory ? `/${input.subdirectory.replace(/\/+$/, '')}` : '';
        const segment = input.type === 'tag'
            ? `/tag/${input.slug}`
            : input.type === 'author'
                ? `/author/${input.slug}`
                : `/posts/${input.slug}`;
        return {url: `${base}${segment}`};
    };

    const recordMailgunEvent = async (input: MailgunEventRequest) => {
        const now = Date.now();
        if (!input.memberId && !input.issueId) {
            return {stored: false};
        }

        if (input.type === 'unsubscribed' && (!input.memberId || !input.newsletterId)) {
            return {stored: false};
        }

        if (input.type === 'complaint' && !input.memberId) {
            return {stored: false};
        }

        if (input.type === 'failed' && (!input.memberId || !input.issueId)) {
            return {stored: false};
        }

        if ((input.type === 'delivered' || input.type === 'opened') && (!input.issueId || !input.memberId)) {
            return {stored: false};
        }

        if (input.type === 'failed' && (!input.issueId || !input.memberId)) {
            return {stored: false};
        }

        if (input.type === 'delivered' || input.type === 'opened' || input.type === 'failed') {
            await newsletterRepository.upsertDelivery({
                id: randomUUID(),
                issueId: input.issueId as string,
                memberId: input.memberId as string,
                status: input.type === 'opened' ? 'opened' : input.type === 'failed' ? 'failed' : 'sent',
                error: input.error ?? null,
                createdAt: now,
                updatedAt: now
            });
        }

        if (analyticsRepository && input.memberId) {
            const eventType = input.type === 'opened'
                ? 'email.opened'
                : input.type === 'failed'
                    ? 'email.failed'
                    : input.type === 'delivered'
                        ? 'email.delivered'
                        : null;
            if (eventType) {
                await analyticsRepository.createEvent({
                    id: randomUUID(),
                    memberId: input.memberId,
                    type: eventType,
                    createdAt: now
                });
            }
        }

        if (input.type === 'complaint' && input.memberId) {
            await newsletterRepository.createSuppression({
                id: randomUUID(),
                memberId: input.memberId,
                reason: 'complaint',
                source: 'provider',
                createdAt: now
            });
        }

        if (input.type === 'unsubscribed' && input.memberId && input.newsletterId) {
            await newsletterRepository.upsertNewsletterMembership({
                id: `${input.newsletterId}:${input.memberId}`,
                newsletterId: input.newsletterId,
                memberId: input.memberId,
                status: 'unsubscribed',
                createdAt: now,
                updatedAt: now
            });
        }

        if (input.type === 'failed' && input.memberId && input.error) {
            const isPermanent = input.error.includes('605') || input.error.includes('607');
            if (isPermanent) {
                await newsletterRepository.createSuppression({
                    id: randomUUID(),
                    memberId: input.memberId,
                    reason: input.error,
                    source: 'provider',
                    createdAt: now
                });
            }
        }

        await newsletterRepository.createEmailEvent({
            id: randomUUID(),
            issueId: input.issueId ?? null,
            memberId: input.memberId ?? null,
            type: input.type === 'opened'
                ? 'opened'
                : input.type === 'failed'
                    ? 'failed'
                    : 'delivered',
            payload: JSON.stringify({error: input.error ?? null}),
            createdAt: now
        });

        return {stored: true};
    };

    const queueWelcomeEmail = async (input: WelcomeEmailRequest) => {
        if (input.source !== 'member') {
            return {queued: false};
        }

        const existing = await newsletterRepository.listAutomatedEmailsByMember(input.memberId, 'welcome');
        if (existing.length > 0) {
            return {queued: false};
        }

        const template = await newsletterRepository.getEmailTemplateByType('welcome');
        if (!template || template.status !== 'active') {
            await newsletterRepository.createAutomatedEmail({
                id: randomUUID(),
                memberId: input.memberId,
                type: 'welcome',
                status: 'pending',
                error: 'welcome_template_missing',
                createdAt: Date.now()
            });
            return {queued: false};
        }

        await newsletterRepository.createAutomatedEmail({
            id: randomUUID(),
            memberId: input.memberId,
            type: 'welcome',
            status: 'queued',
            error: null,
            createdAt: Date.now()
        });

        return {queued: true};
    };

    const runUpdateCheck = async () => {
        const endpoint = process.env.GHOST_UPDATE_ENDPOINT ?? 'https://updates.ghost.org';
        let status: 'queued' | 'completed' = 'completed';
        try {
            const response = await fetch(endpoint, {method: 'GET'});
            if (!response.ok) {
                status = 'queued';
            }
        } catch {
            status = 'queued';
        }
        const check = await repository.createUpdateCheck({
            id: randomUUID(),
            status,
            checkedAt: Date.now()
        });

        return {status, checkedAt: check.checkedAt};
    };

    const cleanupTokens = async () => {
        const cutoff = Date.now() - 1000 * 60 * 60 * 24;
        const staffResetRemoved = await staffRepository.cleanupResetTokens(cutoff);
        const authFactorRemoved = await staffRepository.cleanupAuthFactors(cutoff);
        const memberTokenRemoved = await memberRepository.cleanupAuthTokens(cutoff);
        const removedCount = staffResetRemoved + authFactorRemoved + memberTokenRemoved;
        const cleanup = await repository.createTokenCleanup({
            id: randomUUID(),
            removedCount,
            createdAt: Date.now()
        });

        return {removed: cleanup.removedCount, cleanedAt: cleanup.createdAt};
    };

    const updateMetricsConfig = async (input: MetricsConfigRequest) => {
        const config = await repository.upsertMetricsConfig({
            id: 'metrics',
            enabled: input.enabled ? 1 : 0,
            updatedAt: Date.now()
        });

        metricsClient?.setEnabled(config.enabled === 1);

        return {enabled: config.enabled === 1, updatedAt: config.updatedAt};
    };

    const processOutbox = async () => {
        const now = Date.now();
        const pending = await webhookRepository.listPendingOutbox(now, 50);
        let processed = 0;
        let failed = 0;

        for (const message of pending) {
            if (message.status !== 'pending') {
                continue;
            }
            try {
                const payload = JSON.parse(message.payload) as {forceFail?: boolean};
                if (payload.forceFail) {
                    throw new Error('forced_failure');
                }

                await webhookRepository.deleteOutbox(message.id);
                processed += 1;
            } catch (error) {
                const nextAttempt = message.attempt + 1;
                const reachedMax = nextAttempt >= message.maxAttempts;
                await webhookRepository.updateOutbox({
                    ...message,
                    status: reachedMax ? 'failed' : 'pending',
                    attempt: nextAttempt,
                    nextAttemptAt: now + 5000,
                    lastError: error instanceof Error ? error.message : 'unknown_error'
                });
                failed += 1;
            }
        }

        return {processed, failed};
    };

    return {
        exportData,
        importData,
        runMigration,
        seedFixtures,
        toggleNullableMigration,
        generateUrl,
        recordMailgunEvent,
        queueWelcomeEmail,
        runUpdateCheck,
        cleanupTokens,
        updateMetricsConfig,
        processOutbox
    };
};
