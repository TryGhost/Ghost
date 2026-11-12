module.exports = class MemberSubscribeEvent {
  declare data: {
    memberId: string;
    source: 'import' | 'system' | 'api' | 'admin' | 'member';
  };
  declare timestamp: Date;

  constructor(data: MemberSubscribeEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MemberSubscribeEvent['data'], timestamp?: Date) {
    return new MemberSubscribeEvent(data, timestamp || new Date());
  }
};
