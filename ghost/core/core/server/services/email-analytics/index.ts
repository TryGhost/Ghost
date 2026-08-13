// @ts-expect-error This module lacks type definitions.
import EmailAnalyticsServiceWrapper from './email-analytics-service-wrapper';
import config from '../../../shared/config';
// @ts-expect-error This module lacks type definitions.
import {NewsletterEmailAnalyticsBatchProcessor} from './newsletter-email-analytics-batch-processor';
// @ts-expect-error This module lacks type definitions.
import NewsletterEmailEventStorage from '../email-service/newsletter-email-event-storage';
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
import {queries} from './lib/queries';
import {StartEmailAnalyticsJobEvent} from './events/start-email-analytics-job-event';
import {StartAutomationEmailAnalyticsJobEvent} from './events/start-automation-email-analytics-job-event';
import {AUTOMATION_EMAIL_TAG} from '../member-welcome-emails/constants';
import * as automationsApi from '../automations/automations-api';
import {AutomationEmailAnalyticsBatchProcessor} from './automation-email-analytics-batch-processor';
import {GiftEmailAnalyticsBatchProcessor} from './gift-email-analytics-batch-processor';
import {StartGiftEmailAnalyticsJobEvent} from './events/start-gift-email-analytics-job-event';
// @ts-expect-error This CommonJS helper lacks type declarations.
import {getTransactionalMailgunConfig} from './fetch-mailgun-events';
// @ts-expect-error This CommonJS service wrapper lacks type declarations.
import giftsService from '../gifts';
// @ts-expect-error This CommonJS service lacks type declarations.
import labs from '../../../shared/labs';

export const newsletters = new EmailAnalyticsServiceWrapper({
    logName: 'newsletters'
});

export const automations = new EmailAnalyticsServiceWrapper({
    logName: 'automations',
});

export const gifts = new EmailAnalyticsServiceWrapper({
    logName: 'gifts'
});

export const init = () => {
    const newsletterEmailEventProcessor = new EmailEventProcessor({
        domainEvents,
        db,
        eventStorage: new NewsletterEmailEventStorage({
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
            new NewsletterEmailAnalyticsBatchProcessor({
                config,
                emailEventProcessor: newsletterEmailEventProcessor,
                prometheusClient,
                queries
            })
        )
    });

    automations.init({
        event: StartAutomationEmailAnalyticsJobEvent,
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
        createEventProcessor: () => (
            new AutomationEmailAnalyticsBatchProcessor({
                automationsApi
            })
        )
    });

    if (labs.isSet('giftSubCustomization')) {
        gifts.init({
            event: StartGiftEmailAnalyticsJobEvent,
            mailgunTags: ['gift-delivery'],
            getMailgunConfig: () => getTransactionalMailgunConfig(config),
            jobNames: {
                latestNonOpened: 'email-analytics-gifts-latest-others',
                missing: 'email-analytics-gifts-missing',
                latestOpened: 'email-analytics-gifts-latest-opened',
                scheduled: 'email-analytics-gifts-scheduled'
            },
            cursorSeed: {
                tableName: 'gift_deliveries',
                eventColumns: {
                    delivered: 'outcome_at',
                    failed: 'outcome_at'
                }
            },
            createEventProcessor: () => (
                new GiftEmailAnalyticsBatchProcessor({
                    giftService: {
                        recordDeliveryOutcome: data => giftsService.service.recordDeliveryOutcome(data)
                    }
                })
            )
        });
    }
};
