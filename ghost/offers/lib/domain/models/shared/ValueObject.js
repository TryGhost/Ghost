const {isEqual} = require('lodash');

/**
 * @template T
*/
class ValueObject {
    /** @type {{value: T}} */
    props;

    /** @type T */
    get value() {
        return this.props.value;
    }

    /**
     * @protected
     * @param {T} value
     */
    constructor(value) {
        /** @private */
        this.props = {value};
    }

    /**
     * @param {any} other
     * @returns {boolean}
     */
    equals(other) {
        if (this === other) {
            return true;
        }

        if (other instanceof ValueObject) {
            if (isEqual(this.props.value, other.props.value)) {
                return true;
            }
        }

        return false;
    }
}

module.exports = ValueObject;
