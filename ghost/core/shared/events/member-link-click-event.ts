/**
 * Server-side event firing on page views (page, post, tags...)
 */
module.exports = class MemberLinkClickEvent {
  declare data: {
    memberId: string;
    memberLastSeenAt: string;
    linkId: string;
  };
  declare timestamp: Date;

  constructor(data: MemberLinkClickEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MemberLinkClickEvent['data'], timestamp?: Date) {
    return new MemberLinkClickEvent(data, timestamp || new Date());
  }
};
