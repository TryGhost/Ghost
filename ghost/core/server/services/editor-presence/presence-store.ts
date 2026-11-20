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

export interface StoredClaim {
  member: string;
  /** The lowest order among a document's claims holds its lease. */
  order: number;
}

export interface ClaimTime {
  now: number;
  /** A claim last renewed before this has lapsed. */
  since: number;
  retentionMs: number;
}

export interface Claimed {
  /** Every claim that has not lapsed. */
  claims: StoredClaim[];
  /** Whether this call gave the member a place it did not have. */
  joined: boolean;
}

/**
 * One site's presence set: member = `type:resourceId:userId[:tab]`, score =
 * last heartbeat in server milliseconds. Beside it, the members queued for
 * their document's lease, each with its place. Implementations are site-scoped
 * by construction; Ghost runs one site per process.
 */
export interface PresenceStore {
  readonly kind: 'redis' | 'memory';
  /** Record a heartbeat and drop members last seen before `now - retentionMs`. */
  touch(member: string, now: number, retentionMs: number): Promise<void>;
  /** Members with a heartbeat at or after `since`. */
  read(since: number): Promise<StoredPresence[]>;
  /** Forget a member: its heartbeat and its claim. */
  remove(member: string): Promise<void>;
  /**
   * Renew a member's place in the queue, or give it one behind every claim
   * found, and return the claims that have not lapsed. `to` gives it a new
   * place instead: ahead of every claim found, or behind them. Only this call
   * renews a claim, so a heartbeat never brings a lapsed one back: its member
   * joins again.
   */
  claim(member: string, time: ClaimTime, to?: 'front' | 'back'): Promise<Claimed>;
  /** Claims renewed at or after `since`. */
  claims(since: number): Promise<StoredClaim[]>;
  /** Drop a member's claim. */
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
