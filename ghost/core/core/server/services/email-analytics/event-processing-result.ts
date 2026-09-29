type EventProcessingResultInput = Partial<Omit<EventProcessingResult, 'merge' | 'reset'>>;

export class EventProcessingResult {
  // counts
  delivered: number = 0;
  opened: number = 0;
  temporaryFailed: number = 0;
  permanentFailed: number = 0;
  unsubscribed: number = 0;
  complained: number = 0;
  unhandled: number = 0;
  unprocessable: number = 0;

  // Newly populated newsletter recipient timestamps, excluding repeated events.
  storedDelivered: number = 0;
  storedOpened: number = 0;
  storedPermanentFailed: number = 0;

  // processing failures are counted separately in addition to event type counts
  processingFailures: number = 0;

  // ids seen whilst processing ready for passing to stats aggregator.
  // The arrays are append-only in first-seen order and must only be written through
  // merge() and reset(), or they drift from the membership sets. They are exposed as
  // the backing arrays (not copies) so hot-path `.length` reads stay O(1); `readonly`
  // is a type-only guard, so JS processors must not push to or clear them directly.
  declare readonly emailIds: readonly string[];
  declare readonly memberIds: readonly string[];

  #emailIds: string[] = [];
  #memberIds: string[] = [];
  #emailIdSet = new Set<string>();
  #memberIdSet = new Set<string>();

  constructor(result: EventProcessingResultInput = {}) {
    // Own enumerable accessors keep IDs visible to object equality, spreading, and
    // serialization as they were when they were public fields.
    Object.defineProperties(this, {
      emailIds: { enumerable: true, get: () => this.#emailIds },
      memberIds: { enumerable: true, get: () => this.#memberIds },
    });
    this.merge(result);
  }

  reset(): void {
    this.delivered = 0;
    this.opened = 0;
    this.temporaryFailed = 0;
    this.permanentFailed = 0;
    this.unsubscribed = 0;
    this.complained = 0;
    this.unhandled = 0;
    this.unprocessable = 0;
    this.storedDelivered = 0;
    this.storedOpened = 0;
    this.storedPermanentFailed = 0;
    this.processingFailures = 0;
    // Reassign rather than clear in place so callers holding the previous arrays keep
    // what they had. merge() appends in place, so aggregating and merging must not overlap.
    this.#emailIds = [];
    this.#memberIds = [];
    this.#emailIdSet.clear();
    this.#memberIdSet.clear();
  }

  merge(other: EventProcessingResultInput = {}): void {
    this.delivered += other.delivered || 0;
    this.opened += other.opened || 0;
    this.temporaryFailed += other.temporaryFailed || 0;
    this.permanentFailed += other.permanentFailed || 0;
    this.unsubscribed += other.unsubscribed || 0;
    this.complained += other.complained || 0;
    this.unhandled += other.unhandled || 0;
    this.unprocessable += other.unprocessable || 0;

    this.storedDelivered += other.storedDelivered || 0;
    this.storedOpened += other.storedOpened || 0;
    this.storedPermanentFailed += other.storedPermanentFailed || 0;

    this.processingFailures += other.processingFailures || 0;

    EventProcessingResult.#collect(this.#emailIdSet, this.#emailIds, other.emailIds);
    EventProcessingResult.#collect(this.#memberIdSet, this.#memberIds, other.memberIds);
  }

  // Only visit incoming IDs; rebuilding the accumulated arrays per event is quadratic.
  static #collect(seen: Set<string>, ordered: string[], ids?: readonly string[] | null): void {
    for (const id of ids ?? []) {
      if (id && !seen.has(id)) {
        seen.add(id);
        ordered.push(id);
      }
    }
  }
}
