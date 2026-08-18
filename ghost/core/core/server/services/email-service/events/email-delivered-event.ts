type EmailDeliveredEventData = {
    email: string;
    memberId: string;
    emailId: string;
    emailRecipientId: string;
    timestamp?: Date;
};

export class EmailDeliveredEvent {
    readonly email: string;
    readonly memberId: string;
    readonly emailId: string;
    readonly emailRecipientId: string;
    readonly timestamp: Date;

    private constructor({email, memberId, emailId, emailRecipientId, timestamp}: EmailDeliveredEventData & {timestamp: Date}) {
        this.email = email;
        this.memberId = memberId;
        this.emailId = emailId;
        this.emailRecipientId = emailRecipientId;
        this.timestamp = timestamp;
    }

    static create(data: EmailDeliveredEventData): EmailDeliveredEvent {
        return new EmailDeliveredEvent({...data, timestamp: data.timestamp || new Date()});
    }
}
