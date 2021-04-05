class Error {
    constructor({errorType, errorDetails, message}) {
        this.errorType = errorType;
        this.errorDetails = errorDetails;
        this.message = message;
    }
}

class IncorrectUsageError extends Error {
    constructor(options) {
        super(Object.assign({errorType: 'IncorrectUsageError'}, options));
    }
}

class HostLimitError extends Error {
    constructor(options) {
        super(Object.assign({errorType: 'HostLimitError'}, options));
    }
}

// NOTE: this module is here to serve as a dummy fixture for Ghost-Ignition's errors (https://github.com/TryGhost/Ignition#errors)
module.exports = {
    IncorrectUsageError,
    HostLimitError
};
