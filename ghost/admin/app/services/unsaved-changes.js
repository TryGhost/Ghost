import Service from '@ember/service';

export default class UnsavedChangesService extends Service {
    _registration = null;
    _confirmPromise = null;
    _hasConfirmedLeave = false;

    get isDirty() {
        try {
            return this._registration?.isDirty?.() ?? false;
        } catch (e) {
            // registration's owner may have been destroyed (e.g. controller teardown)
            return false;
        }
    }

    register({isDirty, confirmLeave}) {
        let token = Symbol('unsaved-changes');

        this._registration = {token, isDirty, confirmLeave};
        this._confirmPromise = null;
        this._hasConfirmedLeave = false;

        return () => {
            if (this._registration?.token === token) {
                this._registration = null;
                this._confirmPromise = null;
                this._hasConfirmedLeave = false;
            }
        };
    }

    async guardTransition(transition) {
        if (this._hasConfirmedLeave) {
            return true;
        }

        if (!this.isDirty) {
            return true;
        }

        transition.abort();

        if (await this.confirmLeave()) {
            this._hasConfirmedLeave = true;
            return transition.retry();
        }
    }

    confirmLeave() {
        if (!this._registration?.confirmLeave) {
            return Promise.resolve(true);
        }

        if (!this._confirmPromise) {
            const confirmPromise = Promise.resolve(this._registration.confirmLeave())
                .finally(() => {
                    if (this._confirmPromise === confirmPromise) {
                        this._confirmPromise = null;
                    }
                });

            this._confirmPromise = confirmPromise;
        }

        return this._confirmPromise;
    }
}
