/**
 * Server-side event firing on page views (page, post, tags...)
 */
module.exports = class MemberPageViewEvent {
  declare data: {
    memberId: string;
    memberLastSeenAt: string;
    url: string;
  };
  declare timestamp: Date;

  constructor(data: MemberPageViewEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MemberPageViewEvent['data'], timestamp?: Date) {
    return new MemberPageViewEvent(data, timestamp || new Date());
  }
};
