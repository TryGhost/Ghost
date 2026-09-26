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
  suppress?: boolean;
};

export class EmailBouncedEvent {
  readonly id?: string;
  readonly email: string;
  readonly memberId: string;
  readonly emailId: string;
  readonly error: EmailFailureData['error'];
  readonly emailRecipientId: string;
  readonly timestamp: Date;
  readonly suppress?: boolean;

  private constructor({
    id,
    email,
    memberId,
    emailId,
    error,
    emailRecipientId,
    timestamp,
    suppress,
  }: EmailFailureData & { timestamp: Date }) {
    this.id = id;
    this.memberId = memberId;
    this.emailId = emailId;
    this.email = email;
    this.error = error;
    this.emailRecipientId = emailRecipientId;
    this.timestamp = timestamp;
    this.suppress = suppress;
  }

  static create(data: EmailFailureData): EmailBouncedEvent {
    return new EmailBouncedEvent({ ...data, timestamp: data.timestamp || new Date() });
  }
}
