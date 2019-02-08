const basicSuccessTransformer = () => ({});
const basicFailTransformer = error => ({error});

class AbstractPolling {
    constructor(polledFunction, transformSuccess = basicSuccessTransformer, transformFailure = basicFailTransformer) {
        this.promise = false;

        this.polledFunction = polledFunction;
        this.transformSuccess = transformSuccess;
        this.transformFailure = transformFailure;
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
            .then(result => this.pollingFailed(result))
            .catch(error => this.pollingSucceeded(error))
            .finally(() => {
                this.id = false;
                this.promise = false;
            });

        this.id = Math.floor(Math.random() * 1000);
        return this.id;
    }

    pollingSucceeded(response) {
        this.lastResult = Object.assign({
            id: this.id,
            success: true
        }, this.transformSuccess(response));
    }

    pollingFailed(error) {
        this.lastResult = Object.assign({
            id: this.id,
            success: false
        }, this.transformFailure(error));
    }
}

module.exports = AbstractPolling;
