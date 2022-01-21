/**
 * Adds a filter to `options`. Returns a copy of options to avoid this
 * action to affect other event getters.
 * @param {Object} options The framework `options` object.
 * @param {string} filter The NQL filter to add to the `options` filter.
 * @returns {Object} A copy of options with the filter
 */
function addFilter(options, filter) {
    return {
        ...options,
        filter: options.filter ? `(${options.filter})+(${filter})` : filter
    };
}

module.exports = class EventRepository {
    constructor({
        EmailRecipient,
        MemberSubscribeEvent,
        MemberPaymentEvent,
        MemberStatusEvent,
        MemberLoginEvent,
        MemberPaidSubscriptionEvent,
        labsService
    }) {
        this._MemberSubscribeEvent = MemberSubscribeEvent;
        this._MemberPaidSubscriptionEvent = MemberPaidSubscriptionEvent;
        this._MemberPaymentEvent = MemberPaymentEvent;
        this._MemberStatusEvent = MemberStatusEvent;
        this._MemberLoginEvent = MemberLoginEvent;
        this._EmailRecipient = EmailRecipient;
        this._labsService = labsService;
    }

    async registerPayment(data) {
        await this._MemberPaymentEvent.add({
            ...data,
            source: 'stripe'
        });
    }

    async getNewsletterSubscriptionEvents(options = {}) {
        options.withRelated = ['member'];
        const {data: models, meta} = await this._MemberSubscribeEvent.findPage(options);

        const data = models.map((data) => {
            return {
                type: 'newsletter_event',
                data: data.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getSubscriptionEvents(options = {}) {
        options.withRelated = ['member'];
        const {data: models, meta} = await this._MemberPaidSubscriptionEvent.findPage(options);

        const data = models.map((data) => {
            return {
                type: 'subscription_event',
                data: data.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getPaymentEvents(options = {}) {
        options.withRelated = ['member'];
        const {data: models, meta} = await this._MemberPaymentEvent.findPage(options);

        const data = models.map((data) => {
            return {
                type: 'payment_event',
                data: data.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getLoginEvents(options = {}) {
        options.withRelated = ['member'];
        const {data: models, meta} = await this._MemberLoginEvent.findPage(options);

        const data = models.map((data) => {
            return {
                type: 'login_event',
                data: data.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getSignupEvents(options = {}) {
        options = addFilter(options, 'from_status:null');
        options.withRelated = ['member'];
        const {data: models, meta} = await this._MemberStatusEvent.findPage(options);

        const data = models.map((data) => {
            return {
                type: 'signup_event',
                data: data.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getEmailDelieveredEvents(options = {}) {
        options = addFilter(options, 'delivered_at:-null');
        options.withRelated = ['member', 'email'];
        const {data: models, meta} = await this._EmailRecipient.findPage(
            options
        );

        const data = models.map((data) => {
            return {
                type: 'email_delivered_event',
                data: {
                    member_id: data.get('member_id'),
                    created_at: data.get('delivered_at'),
                    member: data.related('member').toJSON(),
                    email: data.related('email').toJSON()
                }
            };
        });

        return {
            data,
            meta
        };
    }

    async getEmailOpenedEvents(options = {}) {
        options = addFilter(options, 'opened_at:-null');
        options.withRelated = ['member', 'email'];
        const {data: models, meta} = await this._EmailRecipient.findPage(
            options
        );

        const data = models.map((data) => {
            return {
                type: 'email_opened_event',
                data: {
                    member_id: data.get('member_id'),
                    created_at: data.get('opened_at'),
                    member: data.related('member').toJSON(),
                    email: data.related('email').toJSON()
                }
            };
        });

        return {
            data,
            meta
        };
    }

    async getEmailFailedEvents(options = {}) {
        options = addFilter(options, 'failed_at:-null');
        options.withRelated = ['member', 'email'];
        const {data: models, meta} = await this._EmailRecipient.findPage(
            options
        );

        const data = models.map((data) => {
            return {
                type: 'email_failed_event',
                data: {
                    member_id: data.get('member_id'),
                    created_at: data.get('failed_at'),
                    member: data.related('member').toJSON(),
                    email: data.related('email').toJSON()
                }
            };
        });

        return {
            data,
            meta
        };
    }

    async getEventTimeline(options = {}) {
        if (!options.limit) {
            options.limit = 10;
        }

        options.order = 'created_at desc';

        const pages = [
            this.getNewsletterSubscriptionEvents(options),
            this.getSubscriptionEvents(options),
            this.getLoginEvents(options),
            this.getSignupEvents(options)
        ];
        if (this._labsService.isSet('membersActivityFeed') && this._EmailRecipient) {
            pages.push(this.getEmailDelieveredEvents(options));
            pages.push(this.getEmailOpenedEvents(options));
            pages.push(this.getEmailFailedEvents(options));
        }
        const allEventPages = await Promise.all(pages);

        const allEvents = allEventPages.reduce((allEvents, page) => allEvents.concat(page.data), []);

        return allEvents.sort((a, b) => {
            return new Date(b.data.created_at) - new Date(a.data.created_at);
        }).reduce((memo, event, i) => {
            if (event.type === 'newsletter_event' && event.data.subscribed) {
                const previousEvent = allEvents[i - 1];
                const nextEvent = allEvents[i + 1];
                const currentMember = event.data.member_id;

                if (previousEvent && previousEvent.type === 'signup_event') {
                    const previousMember = previousEvent.data.member_id;

                    if (currentMember === previousMember) {
                        return memo;
                    }
                }

                if (nextEvent && nextEvent.type === 'signup_event') {
                    const nextMember = nextEvent.data.member_id;

                    if (currentMember === nextMember) {
                        return memo;
                    }
                }
            }
            return memo.concat(event);
        }, []).slice(0, options.limit);
    }

    async getSubscriptions() {
        const results = await this._MemberSubscribeEvent.findAll({
            aggregateSubscriptionDeltas: true
        });

        const resultsJSON = results.toJSON();

        const cumulativeResults = resultsJSON.reduce((cumulativeResults, result, index) => {
            if (index === 0) {
                return [{
                    date: result.date,
                    subscribed: result.subscribed_delta
                }];
            }
            return cumulativeResults.concat([{
                date: result.date,
                subscribed: result.subscribed_delta + cumulativeResults[index - 1].subscribed
            }]);
        }, []);

        return cumulativeResults;
    }

    async getMRR() {
        const results = await this._MemberPaidSubscriptionEvent.findAll({
            aggregateMRRDeltas: true
        });

        const resultsJSON = results.toJSON();

        const cumulativeResults = resultsJSON.reduce((cumulativeResults, result) => {
            if (!cumulativeResults[result.currency]) {
                return {
                    ...cumulativeResults,
                    [result.currency]: [{
                        date: result.date,
                        mrr: result.mrr_delta,
                        currency: result.currency
                    }]
                };
            }
            return {
                ...cumulativeResults,
                [result.currency]: cumulativeResults[result.currency].concat([{
                    date: result.date,
                    mrr: result.mrr_delta + cumulativeResults[result.currency].slice(-1)[0].mrr,
                    currency: result.currency
                }])
            };
        }, {});

        return cumulativeResults;
    }

    async getVolume() {
        const results = await this._MemberPaymentEvent.findAll({
            aggregatePaymentVolume: true
        });

        const resultsJSON = results.toJSON();

        const cumulativeResults = resultsJSON.reduce((cumulativeResults, result) => {
            if (!cumulativeResults[result.currency]) {
                return {
                    ...cumulativeResults,
                    [result.currency]: [{
                        date: result.date,
                        volume: result.volume_delta,
                        currency: result.currency
                    }]
                };
            }
            return {
                ...cumulativeResults,
                [result.currency]: cumulativeResults[result.currency].concat([{
                    date: result.date,
                    volume: result.volume_delta + cumulativeResults[result.currency].slice(-1)[0].volume,
                    currency: result.currency
                }])
            };
        }, {});

        return cumulativeResults;
    }

    async getStatuses() {
        const results = await this._MemberStatusEvent.findAll({
            aggregateStatusCounts: true
        });

        const resultsJSON = results.toJSON();

        const cumulativeResults = resultsJSON.reduce((cumulativeResults, result, index) => {
            if (index === 0) {
                return [{
                    date: result.date,
                    paid: result.paid_delta,
                    comped: result.comped_delta,
                    free: result.free_delta
                }];
            }
            return cumulativeResults.concat([{
                date: result.date,
                paid: result.paid_delta + cumulativeResults[index - 1].paid,
                comped: result.comped_delta + cumulativeResults[index - 1].comped,
                free: result.free_delta + cumulativeResults[index - 1].free
            }]);
        }, []);

        return cumulativeResults;
    }
};
