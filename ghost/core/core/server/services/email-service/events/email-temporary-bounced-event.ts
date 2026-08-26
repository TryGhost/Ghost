import type {EmailFailureData} from './email-bounced-event';

export class EmailTemporaryBouncedEvent {
    readonly id?: string;
    readonly email: string;
    readonly memberId: string;
    readonly emailId: string;
    readonly error: EmailFailureData['error'];
    readonly emailRecipientId: string;
    readonly timestamp: Date;

    private constructor({id, email, memberId, emailId, emailRecipientId, error, timestamp}: EmailFailureData & {timestamp: Date}) {
        this.id = id;
        this.memberId = memberId;
        this.emailId = emailId;
        this.email = email;
        this.error = error;
        this.emailRecipientId = emailRecipientId;
        this.timestamp = timestamp;
    }

    static create(data: EmailFailureData): EmailTemporaryBouncedEvent {
        return new EmailTemporaryBouncedEvent({...data, timestamp: data.timestamp || new Date()});
    }
}
