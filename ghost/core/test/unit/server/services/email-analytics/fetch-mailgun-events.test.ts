import sinon from 'sinon';

// @ts-expect-error This module lacks type definitions.
import MailgunClient from '../../../../../core/server/services/lib/mailgun-client';
import {fetchMailgunEvents} from '../../../../../core/server/services/email-analytics/fetch-mailgun-events';

type FetchMailgunEventsOptions = Parameters<typeof fetchMailgunEvents>[0];

const DEFAULT_TAGS = ['bulk-email'];
const LATEST_TIMESTAMP = new Date('Thu Feb 25 2021 12:00:00 GMT+0000');
const END_EXAMPLE = new Date('Thu Feb 25 2021 14:00:00 GMT+0000');
const MAILGUN_OPTIONS = {
    event: 'delivered OR opened OR failed OR unsubscribed OR complained',
    limit: 300,
    tags: 'bulk-email',
    begin: 1614254400,
    end: undefined,
    ascending: 'yes'
};

describe('fetchMailgunEvents', function () {
    let config: FetchMailgunEventsOptions['config'];
    let settings: FetchMailgunEventsOptions['settings'];

    beforeEach(function () {
        config = {get() {}};
        settings = {get() {}};
    });

    afterEach(function () {
        sinon.restore();
    });

    async function fetchEvents(options: Partial<Omit<FetchMailgunEventsOptions, 'config' | 'settings' | 'batchHandler'>> = {}) {
        const batchHandler = sinon.spy();
        const mailgunFetchEventsStub = sinon.stub(MailgunClient.prototype, 'fetchEvents').resolves();

        return {
            batchHandler,
            mailgunFetchEventsStub,
            result: await fetchMailgunEvents({
                config,
                settings,
                tags: DEFAULT_TAGS,
                batchHandler,
                ...options
            })
        };
    }

    it('passes correct parameters to Mailgun client', async function () {
        const {batchHandler, mailgunFetchEventsStub} = await fetchEvents({begin: LATEST_TIMESTAMP});

        sinon.assert.calledOnceWithExactly(mailgunFetchEventsStub, MAILGUN_OPTIONS, batchHandler, {maxEvents: undefined});
    });

    it('uses supplied end timestamp and max events', async function () {
        const {batchHandler, mailgunFetchEventsStub} = await fetchEvents({
            begin: LATEST_TIMESTAMP,
            end: END_EXAMPLE,
            maxEvents: 1000
        });

        sinon.assert.calledOnceWithExactly(mailgunFetchEventsStub, {
            ...MAILGUN_OPTIONS,
            end: END_EXAMPLE.getTime() / 1000
        }, batchHandler, {maxEvents: 1000});
    });

    it('uses end timestamp without begin timestamp', async function () {
        const {batchHandler, mailgunFetchEventsStub} = await fetchEvents({end: END_EXAMPLE});

        sinon.assert.calledOnceWithExactly(mailgunFetchEventsStub, {
            ...MAILGUN_OPTIONS,
            begin: undefined,
            end: END_EXAMPLE.getTime() / 1000
        }, batchHandler, {maxEvents: undefined});
    });

    it('uses supplied tags', async function () {
        const {batchHandler, mailgunFetchEventsStub} = await fetchEvents({
            tags: ['bulk-email', 'custom-tag'],
            begin: LATEST_TIMESTAMP
        });

        sinon.assert.calledOnceWithExactly(mailgunFetchEventsStub, {
            ...MAILGUN_OPTIONS,
            tags: 'bulk-email AND custom-tag'
        }, batchHandler, {maxEvents: undefined});
    });

    it('uses provided events when supplied', async function () {
        const {batchHandler, mailgunFetchEventsStub} = await fetchEvents({
            events: ['delivered'],
            begin: LATEST_TIMESTAMP
        });

        sinon.assert.calledOnceWithExactly(mailgunFetchEventsStub, {
            ...MAILGUN_OPTIONS,
            event: 'delivered'
        }, batchHandler, {maxEvents: undefined});
    });
});
