const stripe = require('./payment-processors/stripe');

const adapters = {
    stripe
};

module.exports = class PaymentProcessorService {
    constructor(config) {
        this._ready = new Promise(() => {});
        process.nextTick(() => this.configure(config));
    }

    configure({processors}) {
        this._processors = {};
        this._ready = Promise.all(processors.map(({
            adapter,
            config
        }) => {
            this._processors[adapter] = new adapters[adapter];
            return this._processors[adapter].configure(config);
        })).then(() => {
            return Object.keys(this._processors);
        });

        return this._ready;
    }

    getAdapters() {
        return this._ready;
    }

    getConfig(adapter) {
        if (!adapter) {
            return Promise.reject(new Error('getConfig(adapter) requires an adapter'));
        }

        return this._ready.then(() => {
            return this._processors[adapter].getConfig();
        });
    }

    getPublicConfig(adapter) {
        if (!adapter) {
            return Promise.reject(new Error('getPublicConfig(adapter) requires an adapter'));
        }

        return this._ready.then(() => {
            return this._processors[adapter].getPublicConfig();
        });
    }

    createSubscription(member, metadata) {
        if (!metadata.adapter) {
            return Promise.reject(new Error('createSubscription(member, { adapter }) requires an adapter'));
        }
        return this._ready.then(() => {
            return this._processors[metadata.adapter].createSubscription(member, metadata);
        });
    }

    getSubscription(member, metadata) {
        if (!metadata.adapter) {
            return Promise.reject(new Error('getSubscription(member, { adapter }) requires an adapter'));
        }
        return this._ready.then(() => {
            return this._processors[metadata.adapter].getSubscription(member, metadata);
        });
    }
};
