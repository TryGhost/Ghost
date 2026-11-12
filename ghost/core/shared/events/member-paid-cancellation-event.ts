module.exports = class MemberPaidCancellationEvent {
  declare data: {
    memberId: string;
    memberStatus: string;
    subscriptionId: string;
    entryId: string;
    sourceUrl: string;
  };
  declare timestamp: Date;

  constructor(data: MemberPaidCancellationEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MemberPaidCancellationEvent['data'], timestamp?: Date) {
    return new MemberPaidCancellationEvent(data, timestamp || new Date());
  }
};
