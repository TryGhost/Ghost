/**
 * Events that legacy members code raises. A class holds no state, so it is not
 * asked for with the site. They are here until members has a domain to hold them.
 */
type MemberCreatedEventData = {
  memberId: string;
  batchId?: string;
  source: string;
  attribution?: unknown;
};

type MemberCreatedEventClass = {
  new (data: MemberCreatedEventData, timestamp: Date): MemberCreatedEvent;
  create(data: MemberCreatedEventData, timestamp?: Date): MemberCreatedEvent;
};

export type MemberCreatedEvent = {
  readonly data: MemberCreatedEventData;
  readonly timestamp: Date;
};

export const MemberCreatedEvent: MemberCreatedEventClass =
  require('../../core/shared/events').MemberCreatedEvent;
