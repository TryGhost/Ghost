const errors = require('@tryghost/errors');
const nql = require('@nexes/nql');

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

    async getNewsletterSubscriptionEvents(options = {}, filters = {}) {
        options = {
            ...options,
            withRelated: ['member', 'newsletter'],
            filter: []
        };
        if (filters['data.created_at']) {
            options.filter.push(filters['data.created_at'].replace(/data.created_at:/g, 'created_at:'));
        }
        if (filters['data.source']) {
            options.filter.push(filters['data.source'].replace(/data.source:/g, 'source:'));
        }
        if (filters['data.member_id']) {
            options.filter.push(filters['data.member_id'].replace(/data.member_id:/g, 'member_id:'));
        }
        options.filter = options.filter.join('+');

        const {data: models, meta} = await this._MemberSubscribeEvent.findPage(options);

        const data = models.map((model) => {
            return {
                type: 'newsletter_event',
                data: model.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getSubscriptionEvents(options = {}, filters = {}) {
        options = {
            ...options,
            withRelated: ['member'],
            filter: []
        };
        if (filters['data.created_at']) {
            options.filter.push(filters['data.created_at'].replace(/data.created_at:/g, 'created_at:'));
        }
        if (filters['data.member_id']) {
            options.filter.push(filters['data.member_id'].replace(/data.member_id:/g, 'member_id:'));
        }
        options.filter = options.filter.join('+');

        const {data: models, meta} = await this._MemberPaidSubscriptionEvent.findPage(options);

        const data = models.map((model) => {
            return {
                type: 'subscription_event',
                data: model.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getPaymentEvents(options = {}, filters = {}) {
        options = {
            ...options,
            withRelated: ['member'],
            filter: []
        };
        if (filters['data.created_at']) {
            options.filter.push(filters['data.created_at'].replace(/data.created_at:/g, 'created_at:'));
        }
        if (filters['data.member_id']) {
            options.filter.push(filters['data.member_id'].replace(/data.member_id:/g, 'member_id:'));
        }
        options.filter = options.filter.join('+');

        const {data: models, meta} = await this._MemberPaymentEvent.findPage(options);

        const data = models.map((model) => {
            return {
                type: 'payment_event',
                data: model.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getLoginEvents(options = {}, filters = {}) {
        options = {
            ...options,
            withRelated: ['member'],
            filter: []
        };
        if (filters['data.created_at']) {
            options.filter.push(filters['data.created_at'].replace(/data.created_at:/g, 'created_at:'));
        }
        if (filters['data.member_id']) {
            options.filter.push(filters['data.member_id'].replace(/data.member_id:/g, 'member_id:'));
        }
        options.filter = options.filter.join('+');

        const {data: models, meta} = await this._MemberLoginEvent.findPage(options);

        const data = models.map((model) => {
            return {
                type: 'login_event',
                data: model.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getSignupEvents(options = {}, filters = {}) {
        options = {
            ...options,
            withRelated: ['member'],
            filter: ['from_status:null']
        };
        if (filters['data.created_at']) {
            options.filter.push(filters['data.created_at'].replace(/data.created_at:/g, 'created_at:'));
        }
        if (filters['data.member_id']) {
            options.filter.push(filters['data.member_id'].replace(/data.member_id:/g, 'member_id:'));
        }
        options.filter = options.filter.join('+');

        const {data: models, meta} = await this._MemberStatusEvent.findPage(options);

        const data = models.map((model) => {
            return {
                type: 'signup_event',
                data: model.toJSON(options)
            };
        });

        return {
            data,
            meta
        };
    }

    async getEmailDeliveredEvents(options = {}, filters = {}) {
        options = {
            ...options,
            withRelated: ['member', 'email'],
            filter: ['delivered_at:-null']
        };
        if (filters['data.created_at']) {
            options.filter.push(filters['data.created_at'].replace(/data.created_at:/g, 'delivered_at:'));
        }
        if (filters['data.member_id']) {
            options.filter.push(filters['data.member_id'].replace(/data.member_id:/g, 'member_id:'));
        }
        options.filter = options.filter.join('+');
        options.order = options.order.replace(/created_at/g, 'delivered_at');

        const {data: models, meta} = await this._EmailRecipient.findPage(
            options
        );

        const data = models.map((model) => {
            return {
                type: 'email_delivered_event',
                data: {
                    member_id: model.get('member_id'),
                    created_at: model.get('delivered_at'),
                    member: model.related('member').toJSON(),
                    email: model.related('email').toJSON()
                }
            };
        });

        return {
            data,
            meta
        };
    }

    async getEmailOpenedEvents(options = {}, filters = {}) {
        options = {
            ...options,
            withRelated: ['member', 'email'],
            filter: ['opened_at:-null']
        };
        if (filters['data.created_at']) {
            options.filter.push(filters['data.created_at'].replace(/data.created_at:/g, 'opened_at:'));
        }
        if (filters['data.member_id']) {
            options.filter.push(filters['data.member_id'].replace(/data.member_id:/g, 'member_id:'));
        }
        options.filter = options.filter.join('+');
        options.order = options.order.replace(/created_at/g, 'opened_at');

        const {data: models, meta} = await this._EmailRecipient.findPage(
            options
        );

        const data = models.map((model) => {
            return {
                type: 'email_opened_event',
                data: {
                    member_id: model.get('member_id'),
                    created_at: model.get('opened_at'),
                    member: model.related('member').toJSON(),
                    email: model.related('email').toJSON()
                }
            };
        });

        return {
            data,
            meta
        };
    }

    async getEmailFailedEvents(options = {}, filters = {}) {
        options = {
            ...options,
            withRelated: ['member', 'email'],
            filter: ['failed_at:-null']
        };
        if (filters['data.created_at']) {
            options.filter.push(filters['data.created_at'].replace(/data.created_at:/g, 'failed_at:'));
        }
        if (filters['data.member_id']) {
            options.filter.push(filters['data.member_id'].replace(/data.member_id:/g, 'member_id:'));
        }
        options.filter = options.filter.join('+');
        options.order = options.order.replace(/created_at/g, 'failed_at');

        const {data: models, meta} = await this._EmailRecipient.findPage(
            options
        );

        const data = models.map((model) => {
            return {
                type: 'email_failed_event',
                data: {
                    member_id: model.get('member_id'),
                    created_at: model.get('failed_at'),
                    member: model.related('member').toJSON(),
                    email: model.related('email').toJSON()
                }
            };
        });

        return {
            data,
            meta
        };
    }

    /**
     * Extract a subset of NQL.
     * There are only a few properties allowed.
     * Parenthesis are forbidden.
     * Only ANDs are supported when combining properties.
     */
    getNQLSubset(filter) {
        if (!filter) {
            return {};
        }

        const lex = nql(filter).lex();

        const allowedFilters = ['type','data.created_at','data.member_id'];
        const properties = lex
            .filter(x => x.token === 'PROP')
            .map(x => x.matched.slice(0, -1));
        if (properties.some(prop => !allowedFilters.includes(prop))) {
            throw new errors.IncorrectUsageError({
                message: 'The only allowed filters are `type`, `data.created_at` and `data.member_id`'
            });
        }

        if (lex.find(x => x.token === 'LPAREN')) {
            throw new errors.IncorrectUsageError({
                message: 'The filter can\'t contain parenthesis.'
            });
        }

        const jsonFilter = nql(filter).toJSON();
        const keys = Object.keys(jsonFilter);

        if (keys.length === 1 && keys[0] === '$or') {
            throw new errors.IncorrectUsageError({
                message: 'The top level-filters can only combined with ANDs (+) and not ORs (,).'
            });
        }

        // The filter is validated, it only contains one level of filters concatenated with `+`
        const filters = filter.split('+');

        /** @type {Object.<string, string>} */
        let result = {};

        for (const f of filters) {
            // dirty way to parse a property, but it works according to https://github.com/NexesJS/NQL-Lang/blob/0e12d799a3a9c4d8651444e9284ce16c19cbc4f0/src/nql.l#L18
            const key = f.split(':')[0];
            if (!result[key]) {
                result[key] = f;
            } else {
                result[key] += '+' + f;
            }
        }

        return result;
    }

    async getEventTimeline(options = {}) {
        if (!options.limit) {
            options.limit = 10;
        }

        // Changing this order might need a change in the query functions
        // because of the different underlying models.
        options.order = 'created_at desc';

        // Create a list of all events that can be queried
        const pageActions = [
            {type: 'newsletter_event', action: 'getNewsletterSubscriptionEvents'},
            {type: 'subscription_event', action: 'getSubscriptionEvents'},
            {type: 'login_event', action: 'getLoginEvents'},
            {type: 'payment_event', action: 'getPaymentEvents'},
            {type: 'signup_event', action: 'getSignupEvents'}
        ];
        if (this._EmailRecipient) {
            pageActions.push({type: 'email_delivered_event', action: 'getEmailDeliveredEvents'});
            pageActions.push({type: 'email_opened_event', action: 'getEmailOpenedEvents'});
            pageActions.push({type: 'email_failed_event', action: 'getEmailFailedEvents'});
        }

        let filters = this.getNQLSubset(options.filter);

        //Filter events to query
        const filteredPages = filters.type ? pageActions.filter(page => nql(filters.type).queryJSON(page)) : pageActions;

        //Start the promises
        const pages = filteredPages.map(page => this[page.action](options, filters));

        const allEventPages = await Promise.all(pages);

        const allEvents = allEventPages.reduce((accumulator, page) => accumulator.concat(page.data), []);

        return allEvents.sort((a, b) => {
            return new Date(b.data.created_at) - new Date(a.data.created_at);
        }).reduce((memo, event) => {
            //disable the event filtering
            return memo.concat(event);
        }, []).slice(0, options.limit);
    }

    async getSubscriptions() {
        const results = await this._MemberSubscribeEvent.findAll({
            aggregateSubscriptionDeltas: true
        });

        const resultsJSON = results.toJSON();

        const cumulativeResults = resultsJSON.reduce((accumulator, result, index) => {
            if (index === 0) {
                return [{
                    date: result.date,
                    subscribed: result.subscribed_delta
                }];
            }
            return accumulator.concat([{
                date: result.date,
                subscribed: result.subscribed_delta + accumulator[index - 1].subscribed
            }]);
        }, []);

        return cumulativeResults;
    }

    async getMRR() {
        const results = await this._MemberPaidSubscriptionEvent.findAll({
            aggregateMRRDeltas: true
        });

        const resultsJSON = results.toJSON();

        const cumulativeResults = resultsJSON.reduce((accumulator, result) => {
            if (!accumulator[result.currency]) {
                return {
                    ...accumulator,
                    [result.currency]: [{
                        date: result.date,
                        mrr: result.mrr_delta,
                        currency: result.currency
                    }]
                };
            }
            return {
                ...accumulator,
                [result.currency]: accumulator[result.currency].concat([{
                    date: result.date,
                    mrr: result.mrr_delta + accumulator[result.currency].slice(-1)[0].mrr,
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

        const cumulativeResults = resultsJSON.reduce((accumulator, result) => {
            if (!accumulator[result.currency]) {
                return {
                    ...accumulator,
                    [result.currency]: [{
                        date: result.date,
                        volume: result.volume_delta,
                        currency: result.currency
                    }]
                };
            }
            return {
                ...accumulator,
                [result.currency]: accumulator[result.currency].concat([{
                    date: result.date,
                    volume: result.volume_delta + accumulator[result.currency].slice(-1)[0].volume,
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

        const cumulativeResults = resultsJSON.reduce((accumulator, result, index) => {
            if (index === 0) {
                return [{
                    date: result.date,
                    paid: result.paid_delta,
                    comped: result.comped_delta,
                    free: result.free_delta
                }];
            }
            return accumulator.concat([{
                date: result.date,
                paid: result.paid_delta + accumulator[index - 1].paid,
                comped: result.comped_delta + accumulator[index - 1].comped,
                free: result.free_delta + accumulator[index - 1].free
            }]);
        }, []);

        return cumulativeResults;
    }
};
