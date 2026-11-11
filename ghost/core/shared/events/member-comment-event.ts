/**
 * Server-side event firing on page views (page, post, tags...)
 */
module.exports = class MemberCommentEvent {
  declare data: {
    memberId: string;
    commentId: string;
    postId: string;
  };
  declare timestamp: Date;

  constructor(data: MemberCommentEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: MemberCommentEvent['data'], timestamp?: Date) {
    return new MemberCommentEvent(data, timestamp || new Date());
  }
};
