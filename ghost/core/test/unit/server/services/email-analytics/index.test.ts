import sinon from 'sinon';
import createKnex from 'knex';

import {automations, init, newsletters} from '../../../../../core/server/services/email-analytics';
import {AUTOMATION_EMAIL_TAG} from '../../../../../core/server/services/member-welcome-emails/constants';

describe('email analytics service', function () {
    const automationsApi = {
        getAutomatedEmailRecipientsByMailgunIds: sinon.stub(),
        trackEmailDeliveredAndOpened: sinon.stub()
    };
    const config = {get: sinon.stub()};
    config.get.withArgs('bulkEmail:mailgun:tag').returns('custom-mailgun-tag');
    const domainEvents = {subscribe: sinon.stub()};
    const metrics = {metric: sinon.stub()};
    const settingsCache = {get: sinon.stub()};

    let newslettersInit: sinon.SinonStub;
    let automationsInit: sinon.SinonStub;

    let dependencies: Parameters<typeof init>[0];

    beforeEach(function () {
        newslettersInit = sinon.stub(newsletters, 'init');
        automationsInit = sinon.stub(automations, 'init');

        dependencies = {
            automationsApi,
            config,
            db: {
                knex: createKnex({
                    client: 'better-sqlite3',
                    connection: {
                        filename: ':memory:'
                    },
                    useNullAsDefault: true
                })
            },
            domainEvents,
            emailSuppressionList: {
                removeComplaint: sinon.stub(),
                removeUnsubscribe: sinon.stub()
            },
            membersRepository: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            models: {
                Email: {},
                EmailRecipientFailure: {},
                EmailSpamComplaintEvent: {}
            },
            metrics,
            prometheusClient: null,
            settingsCache
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('initializes newsletter and automation analytics', function () {
        init(dependencies);

        sinon.assert.calledOnceWithExactly(newslettersInit, sinon.match({
            config,
            domainEvents,
            event: {
                name: 'StartEmailAnalyticsJobEvent',
            },
            mailgunTags: ['bulk-email', 'custom-mailgun-tag'],
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
            createEventProcessor: sinon.match.func
        }));

        sinon.assert.calledOnceWithExactly(automationsInit, sinon.match({
            config,
            domainEvents,
            event: {
                name: 'StartAutomationEmailAnalyticsJobEvent',
            },
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
            createEventProcessor: sinon.match.func
        }));
    });

    it('registers Prometheus metrics for member stat aggregation', function () {
        const registerCounter = sinon.stub();

        init({
            ...dependencies,
            prometheusClient: {
                registerCounter,
                getMetric: sinon.stub()
            }
        });

        sinon.assert.calledWith(registerCounter, sinon.match({
            name: 'email_analytics_aggregate_member_stats_count',
            help: 'Count of member stats aggregations'
        }));
    });
});
