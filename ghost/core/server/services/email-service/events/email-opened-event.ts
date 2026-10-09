type EmailOpenedEventData = {
  email: string;
  memberId: string;
  emailId: string;
  emailRecipientId: string;
  timestamp?: Date;
};

export class EmailOpenedEvent {
  readonly email: string;
  readonly memberId: string;
  readonly emailId: string;
  readonly emailRecipientId: string;
  readonly timestamp: Date;

  private constructor({
    email,
    memberId,
    emailId,
    emailRecipientId,
    timestamp,
  }: EmailOpenedEventData & { timestamp: Date }) {
    this.memberId = memberId;
    this.emailId = emailId;
    this.emailRecipientId = emailRecipientId;
    this.email = email;
    this.timestamp = timestamp;
  }

  static create(data: EmailOpenedEventData): EmailOpenedEvent {
    return new EmailOpenedEvent({ ...data, timestamp: data.timestamp || new Date() });
  }
}
