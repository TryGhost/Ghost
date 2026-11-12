module.exports = class MemberEntryViewEvent {
  declare data: {
    memberId: string;
    memberStatus: string;
    entryId: string;
    entryUrl: string;
  };
  declare timestamp: Date;

  constructor(data: MemberEntryViewEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MemberEntryViewEvent['data'], timestamp?: Date) {
    return new MemberEntryViewEvent(data, timestamp || new Date());
  }
};
