import type { ClaimPlace, PresenceStore, StoredClaim, StoredPresence } from './presence-store';

export class MemoryPresenceStore implements PresenceStore {
  readonly kind = 'memory';
  private readonly entries = new Map<string, number>();
  private readonly queue = new Map<string, number>();
  private placed = 0;

  async touch(member: string, now: number, retentionMs: number): Promise<number | undefined> {
    const previous = this.entries.get(member);
    if (previous === undefined || previous < now) {
      this.entries.set(member, now);
    }
    const cutoff = now - retentionMs;
    for (const [key, ts] of this.entries) {
      if (ts < cutoff) {
        this.entries.delete(key);
      }
    }
    return previous;
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
    _retentionMs: number,
    { front = false, move = false }: ClaimPlace = {},
  ): Promise<StoredClaim[]> {
    if (move || !this.queue.has(member)) {
      this.placed += 1;
      this.queue.set(member, front ? -this.placed : this.placed);
    }
    return this.claims();
  }

  async claims(): Promise<StoredClaim[]> {
    return [...this.queue].map(([member, order]) => ({ member, order }));
  }

  async release(member: string): Promise<void> {
    this.queue.delete(member);
  }

  async prune(claims: StoredClaim[]): Promise<void> {
    for (const { member, order } of claims) {
      if (this.queue.get(member) === order) {
        this.queue.delete(member);
      }
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
