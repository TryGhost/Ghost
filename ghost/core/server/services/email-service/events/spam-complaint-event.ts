type SpamComplaintEventData = {
  email: string;
  memberId: string;
  emailId: string;
  timestamp?: Date;
};

export class SpamComplaintEvent {
  readonly email: string;
  readonly memberId: string;
  readonly emailId: string;
  readonly timestamp: Date;

  private constructor({
    email,
    memberId,
    emailId,
    timestamp,
  }: SpamComplaintEventData & { timestamp: Date }) {
    this.memberId = memberId;
    this.emailId = emailId;
    this.email = email;
    this.timestamp = timestamp;
  }

  static create(data: SpamComplaintEventData): SpamComplaintEvent {
    return new SpamComplaintEvent({ ...data, timestamp: data.timestamp || new Date() });
  }
}
