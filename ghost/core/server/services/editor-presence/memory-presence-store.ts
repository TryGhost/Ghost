import {
  documentOf,
  type LeaseTime,
  type PresenceStore,
  type StoredPresence,
} from './presence-store';

export class MemoryPresenceStore implements PresenceStore {
  readonly kind = 'memory';
  private readonly entries = new Map<string, number>();
  /** By document. */
  private readonly holds = new Map<string, { member: string; renewed: number }>();

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
    await this.release(member);
  }

  async hold(member: string, { now, since }: LeaseTime, take = false): Promise<string[]> {
    const document = documentOf(member);
    const held = this.holds.get(document);
    if (take || !held || held.renewed < since || held.member === member) {
      this.holds.set(document, { member, renewed: now });
    }
    return this.holders(since);
  }

  async holders(since: number): Promise<string[]> {
    return [...this.holds.values()]
      .filter(({ renewed }) => renewed >= since)
      .map(({ member }) => member);
  }

  async release(member: string): Promise<void> {
    const document = documentOf(member);
    if (this.holds.get(document)?.member === member) {
      this.holds.delete(document);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
