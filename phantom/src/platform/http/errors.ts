export class HttpError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message?: string) {
        super(message ?? code);
        this.status = status;
        this.code = code;
    }
}
