const EventEmitter = require('events').EventEmitter,
    common = require('../../lib/common');

class Resource extends EventEmitter {
    constructor(type, obj) {
        super();

        this.data = {};
        this.config = {
            type: type,
            reserved: false
        };

        Object.assign(this.data, obj);
    }

    getType() {
        return this.config.type;
    }

    reserve() {
        if (!this.config.reserved) {
            this.config.reserved = true;
        } else {
            common.logging.error(new common.errors.InternalServerError({
                message: 'Resource is already taken. This should not happen.',
                code: 'URLSERVICE_RESERVE_RESOURCE'
            }));
        }
    }

    release() {
        this.config.reserved = false;
    }

    isReserved() {
        return this.config.reserved === true;
    }

    update(obj) {
        Object.assign(this.data, obj);

        if (!this.isReserved()) {
            return;
        }

        this.emit('updated', this);
    }

    remove() {
        if (!this.isReserved()) {
            return;
        }

        this.emit('removed', this);
    }
}

module.exports = Resource;
