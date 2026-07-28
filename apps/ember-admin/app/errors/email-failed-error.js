export default class EmailFailedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EmailFailedError';
    }
}
