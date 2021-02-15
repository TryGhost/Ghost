module.exports = class EventRepository {
    constructor({
        MemberSubscribeEvent,
        MemberPaymentEvent,
        MemberStatusEvent,
        MemberPaidSubscriptionEvent,
        logger
    }) {
        this._MemberSubscribeEvent = MemberSubscribeEvent;
        this._MemberPaidSubscriptionEvent = MemberPaidSubscriptionEvent;
        this._MemberPaymentEvent = MemberPaymentEvent;
        this._MemberStatusEvent = MemberStatusEvent;
        this._logging = logger;
    }

    async registerPayment(data) {
        await this._MemberPaymentEvent.add({
            ...data,
            source: 'stripe'
        });
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
                    mrr: result.mrr_delta + cumulativeResults[result.currency].slice(-1)[0],
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
                    volume: result.volume_delta + cumulativeResults[result.currency].slice(-1)[0],
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
