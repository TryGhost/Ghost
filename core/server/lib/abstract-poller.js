class AbstractPolling {
    constructor(polledFunction) {
        this.promise = false;
        this.polledFunction = polledFunction;
    }

    get isRunning() {
        return this.promise !== false;
    }

    get state() {
        return {
            busy: this.isRunning,
            lastResult: this.lastResult
        };
    }

    run(...args) {
        if (this.isRunning) {
            // @todo: use a proper Ghost Error
            return Promise.reject(new Error('An import is already running. Please wait until the current import finishes before starting a new one'));
        }

        this.promise = this.polledFunction(...args)
            .then(result => this.pollingSucceeded(result))
            .catch(error => this.pollingFailed(error))
            .finally(() => {
                this.id = false;
                this.promise = false;
            });

        this.id = Math.floor(Math.random() * 1000);
        return this.id;
    }

    pollingSucceeded(result) {
        this.lastResult = {
            id: this.id,
            success: true,
            result
        }
    }

    pollingFailed(error) {
        this.lastResult = {
            id: this.id,
            success: false,
            error
        };
    }
}

module.exports = AbstractPolling;
