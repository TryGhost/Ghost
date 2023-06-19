export class MailEvent {
    constructor(
        readonly id: string,
        readonly type: string,
        readonly messageId: string,
        readonly recipient: string,
        readonly timestampMs: number,
        readonly deleted: boolean = false
    ) {}
}
