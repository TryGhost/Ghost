type EmailUnsubscribedEventData = {
  email: string;
  memberId: string;
  emailId: string;
  timestamp?: Date;
};

export class EmailUnsubscribedEvent {
  readonly email: string;
  readonly memberId: string;
  readonly emailId: string;
  readonly timestamp: Date;

  private constructor({
    email,
    memberId,
    emailId,
    timestamp,
  }: EmailUnsubscribedEventData & { timestamp: Date }) {
    this.memberId = memberId;
    this.emailId = emailId;
    this.email = email;
    this.timestamp = timestamp;
  }

  static create(data: EmailUnsubscribedEventData): EmailUnsubscribedEvent {
    return new EmailUnsubscribedEvent({ ...data, timestamp: data.timestamp || new Date() });
  }
}
