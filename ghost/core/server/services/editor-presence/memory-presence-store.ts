import type {
  ClaimTime,
  Claimed,
  PresenceStore,
  StoredClaim,
  StoredPresence,
} from './presence-store';

export class MemoryPresenceStore implements PresenceStore {
  readonly kind = 'memory';
  private readonly entries = new Map<string, number>();
  private readonly queue = new Map<string, { order: number; renewed: number }>();

  async touch(member: string, now: number, retentionMs: number): Promise<void> {
    const current = this.entries.get(member);
    if (current === undefined || current < now) {
      this.entries.set(member, now);
    }
    const cutoff = now - retentionMs;
    for (const [key, ts] of this.entries) {
      if (ts < cutoff) {
        this.entries.delete(key);
      }
    }
  }

  async read(since: number): Promise<StoredPresence[]> {
    const result: StoredPresence[] = [];
    for (const [member, ts] of this.entries) {
      if (ts >= since) {
        result.push({ member, ts });
      }
    }
    return result;
  }

  async remove(member: string): Promise<void> {
    this.entries.delete(member);
    this.queue.delete(member);
  }

  async claim(member: string, { now, since }: ClaimTime, to?: 'front' | 'back'): Promise<Claimed> {
    for (const [key, { renewed }] of this.queue) {
      if (renewed < since) {
        this.queue.delete(key);
      }
    }
    const own = this.queue.get(member);
    if (own && !to) {
      own.renewed = now;
      return { claims: await this.claims(since), joined: false };
    }
    const orders = [...this.queue].filter(([key]) => key !== member).map(([, { order }]) => order);
    const order = to === 'front' ? Math.min(0, ...orders) - 1 : Math.max(0, ...orders) + 1;
    this.queue.set(member, { order, renewed: now });
    return { claims: await this.claims(since), joined: !to };
  }

  async claims(since: number): Promise<StoredClaim[]> {
    return [...this.queue]
      .filter(([, { renewed }]) => renewed >= since)
      .map(([member, { order }]) => ({ member, order }));
  }

  async release(member: string): Promise<void> {
    this.queue.delete(member);
  }

  get size(): number {
    return this.entries.size;
  }
}
