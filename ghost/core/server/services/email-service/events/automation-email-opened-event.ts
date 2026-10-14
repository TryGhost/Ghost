type AutomationEmailOpenedEventData = {
  memberId: string;
  emailRecipientId: string;
  timestamp: Date;
};

export class AutomationEmailOpenedEvent {
  readonly memberId: string;
  readonly emailRecipientId: string;
  readonly timestamp: Date;

  private constructor({ memberId, emailRecipientId, timestamp }: AutomationEmailOpenedEventData) {
    this.memberId = memberId;
    this.emailRecipientId = emailRecipientId;
    this.timestamp = timestamp;
  }

  static create(data: AutomationEmailOpenedEventData): AutomationEmailOpenedEvent {
    return new AutomationEmailOpenedEvent(data);
  }
}
