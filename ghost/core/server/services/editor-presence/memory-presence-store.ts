import type { PresenceStore, StoredPresence } from './presence-store';

export class MemoryPresenceStore implements PresenceStore {
  readonly kind = 'memory';
  private readonly entries = new Map<string, number>();

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
  }

  get size(): number {
    return this.entries.size;
  }
}
