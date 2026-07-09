// @ts-expect-error This module lacks type definitions.
import config from '../../../shared/config';
// @ts-expect-error This module lacks type definitions.
import EmailAnalyticsServiceWrapper from './email-analytics-service-wrapper';
// @ts-expect-error This module lacks type definitions.
import StartEmailAnalyticsJobEvent from './events/start-email-analytics-job-event';
import {StartAutomationEmailAnalyticsJobEvent} from './events/start-automation-email-analytics-job-event';
import {AUTOMATION_EMAIL_TAG} from '../member-welcome-emails/constants';
import * as automationsApi from '../automations/automations-api';
import {createAutomationEmailAnalyticsProcessor} from './automation-email-analytics-processor';
import {createNewsletterEmailAnalyticsProcessor} from './newsletter-email-analytics-processor';
// @ts-expect-error This module lacks type definitions.
import domainEvents from '@tryghost/domain-events';
// @ts-expect-error This module lacks type definitions.
import db from '../../data/db';
// @ts-expect-error This module lacks type definitions.
import queries from './lib/queries';
import membersService from '../members';
// @ts-expect-error This module lacks type definitions.
import models from '../../models';
// @ts-expect-error This module lacks type definitions.
import emailSuppressionList from '../email-suppression-list';
// @ts-expect-error This module lacks type definitions.
import prometheusClient from '../../../shared/prometheus-client';

const newsletterMailgunTags = ['bulk-email'];
const customNewsletterTag = config.get('bulkEmail:mailgun:tag');
if (customNewsletterTag) {
    newsletterMailgunTags.push(customNewsletterTag);
}

export const newsletterProcessor = createNewsletterEmailAnalyticsProcessor({
    config,
    domainEvents,
    db,
    queries,
    membersRepository: membersService.api.members,
    models,
    emailSuppressionList,
    prometheusClient
});
const automationProcessor = createAutomationEmailAnalyticsProcessor({automationsApi});

const newslettersWrapper = new EmailAnalyticsServiceWrapper({
    logName: 'newsletters',
    mailgunTags: newsletterMailgunTags,
    event: StartEmailAnalyticsJobEvent,
    jobNames: {
        latestNonOpened: 'email-analytics-latest-others',
        missing: 'email-analytics-missing',
        latestOpened: 'email-analytics-latest-opened',
        scheduled: 'email-analytics-scheduled'
    },
    eventSource: {
        tableName: 'email_recipients',
        eventColumns: {
            delivered: 'delivered_at',
            opened: 'opened_at',
            failed: 'failed_at'
        }
    },
    processEventBatch: newsletterProcessor.processEventBatch,
    flush: newsletterProcessor.flush
});

const automationsWrapper = new EmailAnalyticsServiceWrapper({
    logName: 'automations',
    mailgunTags: [AUTOMATION_EMAIL_TAG],
    event: StartAutomationEmailAnalyticsJobEvent,
    jobNames: {
        latestNonOpened: 'email-analytics-automation-latest-others',
        missing: 'email-analytics-automation-missing',
        latestOpened: 'email-analytics-automation-latest-opened',
        scheduled: 'email-analytics-automation-scheduled'
    },
    eventSource: {
        tableName: 'automated_email_recipients',
        eventColumns: {
            delivered: 'delivered_at',
            opened: 'opened_at'
        }
    },
    processEventBatch: automationProcessor.processEventBatch
    // Automations aggregate inline while processing, so they provide no flush hook.
});

export const newsletters = newslettersWrapper;
export const automations = automationsWrapper;

export const init = () => {
    newslettersWrapper.init();
    automationsWrapper.init();
};
