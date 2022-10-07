export default class EmailFailedError extends Error {
    constructor({message, context, type = 'error'}) {
        super(message);
        this.name = 'MemberImportError';
        this.context = context;
        this.type = type;
    }
}
