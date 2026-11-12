module.exports = class MemberSignupEvent {
  declare data: {
    memberId: string;
    entryId: string;
    sourceUrl: string;
  };
  declare timestamp: Date;

  constructor(data: MemberSignupEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MemberSignupEvent['data'], timestamp?: Date) {
    return new MemberSignupEvent(data, timestamp || new Date());
  }
};
