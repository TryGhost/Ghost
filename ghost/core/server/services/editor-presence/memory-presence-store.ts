import type { PresenceStore, StoredClaim, StoredPresence } from './presence-store';

export class MemoryPresenceStore implements PresenceStore {
  readonly kind = 'memory';
  private readonly entries = new Map<string, number>();
  private readonly queue = new Map<string, number>();

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

  async claim(
    member: string,
    order: number,
    _retentionMs: number,
    replace = false,
  ): Promise<StoredClaim[]> {
    if (replace || !this.queue.has(member)) {
      this.queue.set(member, order);
    }
    return this.claims();
  }

  async claims(): Promise<StoredClaim[]> {
    return [...this.queue].map(([member, order]) => ({ member, order }));
  }

  async release(members: string[]): Promise<void> {
    for (const member of members) {
      this.queue.delete(member);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
