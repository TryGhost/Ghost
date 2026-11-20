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
  /** The lowest order among a document's live members holds its lease. No two claims share one. */
  order: number;
}

export interface ClaimPlace {
  /** Ahead of every claim so far, not behind them. */
  front?: boolean;
  /** Give a member that is already queued a new place. */
  move?: boolean;
}

/**
 * One site's presence set: member = `type:resourceId:userId[:tab]`, score =
 * last heartbeat in server milliseconds. Beside it, the members queued for
 * their document's lease, each with its place. Implementations are site-scoped
 * by construction; Ghost runs one site per process.
 */
export interface PresenceStore {
  readonly kind: 'redis' | 'memory';
  /**
   * Record a heartbeat and drop members last seen before `now - retentionMs`.
   * Answers the member's heartbeat before this one, if it was still stored.
   */
  touch(member: string, now: number, retentionMs: number): Promise<number | undefined>;
  /** Members with a heartbeat at or after `since`. */
  read(since: number): Promise<StoredPresence[]>;
  /** Forget a member: its heartbeat and its claim. */
  remove(member: string): Promise<void>;
  /**
   * Queue a member and return every claim. The store numbers places in the
   * order they are asked for, so a later one is behind every earlier one, or
   * ahead of them with `front`. A member already queued keeps its place unless
   * `move` gives it a new one.
   */
  claim(member: string, retentionMs: number, place?: ClaimPlace): Promise<StoredClaim[]>;
  claims(): Promise<StoredClaim[]>;
  /** Drop a member's own claim. */
  release(member: string): Promise<void>;
  /** Drop claims whose members stopped, each only while it still has the order given. */
  prune(claims: StoredClaim[]): Promise<void>;
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
