import type {Knex} from 'knex';
import type {PrometheusClient} from '@tryghost/prometheus-metrics';
import type {ConfigInstance} from '../../../shared/config/loader';
import type {GhostMetrics} from '@tryghost/metrics';
// @ts-expect-error This module lacks type definitions.
import type SettingsCache from '../../../shared/settings-cache';
import {EmailAnalyticsServiceWrapper} from './email-analytics-service-wrapper';
// @ts-expect-error This module lacks type definitions.
import {AGGREGATE_MEMBER_STATS_METRIC_NAME, NewsletterEmailAnalyticsBatchProcessor} from './newsletter-email-analytics-batch-processor';
// @ts-expect-error This module lacks type definitions.
import NewsletterEmailEventStorage from '../email-service/newsletter-email-event-storage';
// @ts-expect-error This module lacks type definitions.
import EmailEventProcessor from '../email-service/email-event-processor';
import type membersService from '../members';
// @ts-expect-error This module lacks type definitions.
import type EmailSuppressionList from '../email-suppression-list';
// @ts-expect-error This module lacks type definitions.
import type {EmailRecipientFailure, EmailSpamComplaintEvent, Email} from '../../models';
// @ts-expect-error This module lacks type definitions.
import type DomainEvents from '@tryghost/domain-events';
import {Queries} from './lib/queries';
import {StartEmailAnalyticsJobEvent} from './events/start-email-analytics-job-event';
import {StartAutomationEmailAnalyticsJobEvent} from './events/start-automation-email-analytics-job-event';
import {AUTOMATION_EMAIL_TAG} from '../member-welcome-emails/constants';
import type * as AutomationsApi from '../automations/automations-api';
import {AutomationEmailAnalyticsBatchProcessor} from './automation-email-analytics-batch-processor';

export const newsletters = new EmailAnalyticsServiceWrapper({
    logName: 'newsletters'
});

export const automations = new EmailAnalyticsServiceWrapper({
    logName: 'automations',
});

export const init = ({
    automationsApi,
    config,
    db,
    domainEvents,
    emailSuppressionList,
    membersRepository,
    models: {
        Email,
        EmailRecipientFailure,
        EmailSpamComplaintEvent
    },
    metrics,
    prometheusClient,
    settingsCache
}: {
    automationsApi: Pick<typeof AutomationsApi, 'getAutomatedEmailRecipientsByMailgunIds' | 'trackEmailDeliveredAndOpened'>;
    config: Pick<ConfigInstance, 'get'>;
    db: {knex: Knex},
    domainEvents: Pick<DomainEvents, 'subscribe'>;
    emailSuppressionList: Pick<typeof EmailSuppressionList, 'removeComplaint' | 'removeUnsubscribe'>;
    membersRepository: Pick<typeof membersService.api.members, 'get' | 'update'>;
    models: {
        Email: Email;
        EmailRecipientFailure: EmailRecipientFailure;
        EmailSpamComplaintEvent: EmailSpamComplaintEvent;
    };
    metrics: Pick<GhostMetrics, 'metric'>;
    prometheusClient: Pick<PrometheusClient, 'registerCounter' | 'getMetric'> | null;
    settingsCache: Pick<typeof SettingsCache, 'get'>;
}) => {
    const queries = new Queries(db.knex);

    const newsletterEmailEventProcessor = new EmailEventProcessor({
        domainEvents,
        db,
        eventStorage: new NewsletterEmailEventStorage({
            config,
            db,
            membersRepository,
            models: {
                Email,
                EmailRecipientFailure,
                EmailSpamComplaintEvent
            },
            emailSuppressionList,
            prometheusClient
        }),
        prometheusClient
    });

    const newsletterMailgunTags = ['bulk-email'];
    if (config.get('bulkEmail:mailgun:tag')) {
        newsletterMailgunTags.push(config.get('bulkEmail:mailgun:tag'));
    }

    prometheusClient?.registerCounter({
        name: AGGREGATE_MEMBER_STATS_METRIC_NAME,
        help: 'Count of member stats aggregations'
    });

    newsletters.init({
        config,
        domainEvents,
        event: StartEmailAnalyticsJobEvent,
        queries,
        mailgunTags: newsletterMailgunTags,
        jobNames: {
            latestNonOpened: 'email-analytics-latest-others',
            missing: 'email-analytics-missing',
            latestOpened: 'email-analytics-latest-opened',
            scheduled: 'email-analytics-scheduled'
        },
        cursorSeed: {
            tableName: 'email_recipients',
            eventColumns: {
                delivered: 'delivered_at',
                opened: 'opened_at',
                failed: 'failed_at'
            }
        },
        metrics,
        settingsCache,
        createEventProcessor: () => (
            new NewsletterEmailAnalyticsBatchProcessor({
                config,
                emailEventProcessor: newsletterEmailEventProcessor,
                prometheusClient,
                queries
            })
        )
    });

    automations.init({
        config,
        domainEvents,
        event: StartAutomationEmailAnalyticsJobEvent,
        queries,
        mailgunTags: [AUTOMATION_EMAIL_TAG],
        jobNames: {
            latestNonOpened: 'email-analytics-automation-latest-others',
            missing: 'email-analytics-automation-missing',
            latestOpened: 'email-analytics-automation-latest-opened',
            scheduled: 'email-analytics-automation-scheduled'
        },
        cursorSeed: {
            tableName: 'automated_email_recipients',
            eventColumns: {
                delivered: 'delivered_at',
                opened: 'opened_at'
            }
        },
        metrics,
        settingsCache,
        createEventProcessor: () => (
            new AutomationEmailAnalyticsBatchProcessor({
                automationsApi
            })
        )
    });
};
