export const RESOURCE_TYPES = ['post', 'page'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface PresenceMember {
  type: ResourceType;
  resourceId: string;
  userId: string;
  /** Set when the client names its editor tab, so each tab is a member of its own. */
  tab?: string;
}

export interface StoredPresence {
  member: string;
  ts: number;
}

export interface LeaseTime {
  now: number;
  /** A hold last renewed before this has lapsed. */
  since: number;
  retentionMs: number;
}

/**
 * One site's presence set: member = `type:resourceId:userId[:tab]`, score =
 * last heartbeat in server milliseconds. Beside it, which member holds each
 * document's lease. Implementations are site-scoped by construction; Ghost
 * runs one site per process.
 */
export interface PresenceStore {
  readonly kind: 'redis' | 'memory';
  /** Record a heartbeat and drop members last seen before `now - retentionMs`. */
  touch(member: string, now: number, retentionMs: number): Promise<void>;
  /** Members with a heartbeat at or after `since`. */
  read(since: number): Promise<StoredPresence[]>;
  /** Forget a member: its heartbeat and its hold. */
  remove(member: string): Promise<void>;
  /**
   * Hold the member's document if nobody does, or keep holding it, and answer
   * the member holding each document. With `take`, hold it whoever does. Of
   * two members that ask for a free document at once the store lets one in;
   * it is never left to what each of them read.
   */
  hold(member: string, time: LeaseTime, take?: boolean): Promise<string[]>;
  /** The member holding each document, for holds renewed at or after `since`. */
  holders(since: number): Promise<string[]>;
  /** Give up the member's hold on its document, if it has one. */
  release(member: string): Promise<void>;
}

export function isResourceType(value: string): value is ResourceType {
  return (RESOURCE_TYPES as readonly string[]).includes(value);
}

export function encodeMember(member: PresenceMember): string {
  const base = `${member.type}:${member.resourceId}:${member.userId}`;
  return member.tab ? `${base}:${member.tab}` : base;
}

export function decodeMember(member: string): PresenceMember | null {
  const parts = member.split(':');
  if (parts.length !== 3 && parts.length !== 4) {
    return null;
  }
  const [type, resourceId, userId, tab] = parts;
  if (!isResourceType(type) || !resourceId || !userId || tab === '') {
    return null;
  }
  return tab === undefined ? { type, resourceId, userId } : { type, resourceId, userId, tab };
}

/** The document a member is on, as `type:resourceId`. */
export function documentOf(member: string): string {
  return member.split(':', 2).join(':');
}
