module.exports = class EventProcessor {
    constructor({logging} = {}) {
        this.logging = logging || console;
    }

    // override these in a sub-class to define app-specific behaviour

    async getEmailId(/*event*/) {
        return undefined;
    }

    async getMemberId(/*event*/) {
        return undefined;
    }

    async handleDelivered(/*event*/) {
        return false;
    }

    async handleOpened(/*event*/) {
        return false;
    }

    async handleTemporaryFailed(/*event*/) {
        return false;
    }

    async handlePermanentFailed(/*event*/) {
        return false;
    }

    async handleUnsubscribed(/*event*/) {
        return false;
    }

    async handleComplained(/*event*/) {
        return false;
    }

    // superclass functionality ------------------------------------------------

    async process(event) {
        if (event.type === 'delivered') {
            return this._handleDelivered(event);
        }

        if (event.type === 'opened') {
            return this._handleOpened(event);
        }

        if (event.type === 'failed') {
            if (event.severity === 'permanent') {
                return this._handlePermanentFailed(event);
            } else {
                return this._handleTemporaryFailed(event);
            }
        }

        if (event.type === 'unsubscribed') {
            return this._handleUnsubscribed(event);
        }

        if (event.type === 'complained') {
            return this._handleComplained(event);
        }

        return {
            unhandled: 1
        };
    }

    async _handleDelivered(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        const handlerSuccess = await this.handleDelivered(event);

        if (handlerSuccess) {
            const memberId = await this._getMemberId(event);

            return {
                delivered: 1,
                emailIds: [emailId],
                memberIds: [memberId]
            };
        }

        return {unprocessable: 1};
    }

    async _handleOpened(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        const handlerSuccess = await this.handleOpened(event);

        if (handlerSuccess) {
            const memberId = await this._getMemberId(event);

            return {
                opened: 1,
                emailIds: [emailId],
                memberIds: [memberId]
            };
        }

        return {unprocessable: 1};
    }

    async _handlePermanentFailed(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        const handlerSuccess = await this.handlePermanentFailed(event);

        if (handlerSuccess) {
            return {
                permanentFailed: 1,
                emailIds: [emailId]
            };
        }

        return {unprocessable: 1};
    }

    async _handleTemporaryFailed(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        const handlerSuccess = await this.handleTemporaryFailed(event);

        if (handlerSuccess) {
            return {
                temporaryFailed: 1,
                emailIds: [emailId]
            };
        }

        return {unprocessable: 1};
    }

    async _handleUnsubscribed(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        const handlerSuccess = await this.handleUnsubscribed(event);

        if (handlerSuccess) {
            return {
                unsubscribed: 1,
                emailIds: [emailId]
            };
        }

        return {
            unprocessable: 1
        };
    }

    async _handleComplained(event) {
        const emailId = await this._getEmailId(event);

        if (!emailId) {
            return {unprocessable: 1};
        }

        const handlerSuccess = await this.handleComplained(event);

        if (handlerSuccess) {
            return {
                complained: 1,
                emailIds: [emailId]
            };
        }

        return {
            unprocessable: 1
        };
    }

    async _getEmailId(event) {
        if (event.emailId) {
            return event.emailId;
        }

        return await this.getEmailId(event);
    }

    async _getMemberId(event) {
        if (event.memberId) {
            return event.memberId;
        }

        return await this.getMemberId(event);
    }
};
