// @ts-expect-error This module lacks type definitions.
import EmailAnalyticsServiceWrapper from './email-analytics-service-wrapper';
// @ts-expect-error This module lacks type definitions.
import config from '../../../shared/config';
// @ts-expect-error This module lacks type definitions.
import {NewsletterEmailAnalyticsProcessor} from './newsletter-email-analytics-processor';
// @ts-expect-error This module lacks type definitions.
import EmailEventStorage from '../email-service/email-event-storage';
// @ts-expect-error This module lacks type definitions.
import EmailEventProcessor from '../email-service/email-event-processor';
// @ts-expect-error This module lacks type definitions.
import db from '../../data/db';
import membersService from '../members';
// @ts-expect-error This module lacks type definitions.
import emailSuppressionList from '../email-suppression-list';
// @ts-expect-error This module lacks type definitions.
import {EmailRecipientFailure, EmailSpamComplaintEvent, Email} from '../../models';
// @ts-expect-error This module lacks type definitions.
import domainEvents from '@tryghost/domain-events';
// @ts-expect-error This module lacks type definitions.
import prometheusClient from '../../../shared/prometheus-client';
// @ts-expect-error This module lacks type definitions.
import queries from './lib/queries';
// @ts-expect-error This module lacks type definitions.
import StartEmailAnalyticsJobEvent from './events/start-email-analytics-job-event';

export const newsletters = new EmailAnalyticsServiceWrapper({
    logName: 'newsletters'
});

export const init = () => {
    const newsletterEmailEventProcessor = new EmailEventProcessor({
        domainEvents,
        db,
        eventStorage: new EmailEventStorage({
            db,
            membersRepository: membersService.api.members,
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

    newsletters.init({
        event: StartEmailAnalyticsJobEvent,
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
        prometheusClient,
        createEventProcessor: () => (
            new NewsletterEmailAnalyticsProcessor({
                config,
                emailEventProcessor: newsletterEmailEventProcessor,
                prometheusClient,
                queries
            })
        )
    });
};
