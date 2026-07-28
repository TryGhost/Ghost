import Service from '@ember/service';

const ONE_MINUTE = 1 * 60 * 1000;

export default class DataCacheService extends Service {
    cache = {};
    timeouts = {};

    get(key) {
        return this.cache[key];
    }

    set(key, data, lifetime = ONE_MINUTE) {
        this.cache[key] = data;

        this.timeouts[key] = window.setTimeout(() => {
            delete this.cache[key];
            delete this.timeouts[key];
        }, lifetime);

        return this.cache[key];
    }

    clear() {
        this._clearAllTimeouts();
        this.cache = {};
        this.timeouts = {};
    }

    willDestroy() {
        this._clearAllTimeouts();
    }

    _clearAllTimeouts() {
        Object.keys(this.timeouts).forEach(key => window.clearTimeout(this.timeouts[key]));
    }
}
