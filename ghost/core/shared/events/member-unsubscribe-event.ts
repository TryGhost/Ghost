module.exports = class MemberUnsubscribeEvent {
  declare data: {
    memberId: string;
    memberStatus: string;
    entryId: string;
    sourceUrl: string;
  };
  declare timestamp: Date;

  constructor(data: MemberUnsubscribeEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MemberUnsubscribeEvent['data'], timestamp?: Date) {
    return new MemberUnsubscribeEvent(data, timestamp || new Date());
  }
};
