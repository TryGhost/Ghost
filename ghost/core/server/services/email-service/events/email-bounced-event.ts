export type EmailFailureData = {
  id?: string;
  email: string;
  memberId: string;
  emailId: string;
  error: {
    message: string;
    code: number;
    enhancedCode?: string | null;
  } | null;
  emailRecipientId: string;
  timestamp?: Date;
};

export class EmailBouncedEvent {
  readonly id?: string;
  readonly email: string;
  readonly memberId: string;
  readonly emailId: string;
  readonly error: EmailFailureData['error'];
  readonly emailRecipientId: string;
  readonly timestamp: Date;

  private constructor({
    id,
    email,
    memberId,
    emailId,
    error,
    emailRecipientId,
    timestamp,
  }: EmailFailureData & { timestamp: Date }) {
    this.id = id;
    this.memberId = memberId;
    this.emailId = emailId;
    this.email = email;
    this.error = error;
    this.emailRecipientId = emailRecipientId;
    this.timestamp = timestamp;
  }

  static create(data: EmailFailureData): EmailBouncedEvent {
    return new EmailBouncedEvent({ ...data, timestamp: data.timestamp || new Date() });
  }
}
