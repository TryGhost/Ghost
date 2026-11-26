type Mention = {
  verified: boolean;
  source: URL;
  [key: string]: unknown;
};

export type MentionCreatedEventData = {
  mention: Mention;
};

/** A webmention was received and stored. */
export default class MentionCreatedEvent {
  data: MentionCreatedEventData;
  timestamp: Date;

  constructor(data: MentionCreatedEventData, timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MentionCreatedEventData, timestamp?: Date) {
    return new MentionCreatedEvent(data, timestamp ?? new Date());
  }
}
