module.exports = class MemberPaidConversionEvent {
  declare data: {
    memberId: string;
    memberStatus: string;
    subscriptionId: string;
    entryId: string;
    sourceUrl: string;
  };
  declare timestamp: Date;

  constructor(data: MemberPaidConversionEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MemberPaidConversionEvent['data'], timestamp?: Date) {
    return new MemberPaidConversionEvent(data, timestamp || new Date());
  }
};
