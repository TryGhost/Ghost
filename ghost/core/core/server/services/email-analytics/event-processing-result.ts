type EventProcessingResultInput = Partial<Omit<EventProcessingResult, 'merge'>>;

export class EventProcessingResult {
  #emailIdSet = new Set<string>();
  #memberIdSet = new Set<string>();

  // counts
  delivered: number = 0;
  opened: number = 0;
  temporaryFailed: number = 0;
  permanentFailed: number = 0;
  unsubscribed: number = 0;
  complained: number = 0;
  unhandled: number = 0;
  unprocessable: number = 0;

  // processing failures are counted separately in addition to event type counts
  processingFailures: number = 0;

  // ids seen whilst processing ready for passing to stats aggregator
  emailIds: string[] = [];
  memberIds: string[] = [];

  constructor(result: EventProcessingResultInput = {}) {
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
    this.processingFailures = 0;
    this.emailIds = [];
    this.memberIds = [];
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

    this.processingFailures += other.processingFailures || 0;

    for (const emailId of other.emailIds || []) {
      if (emailId && !this.#emailIdSet.has(emailId)) {
        this.#emailIdSet.add(emailId);
        this.emailIds.push(emailId);
      }
    }
    for (const memberId of other.memberIds || []) {
      if (memberId && !this.#memberIdSet.has(memberId)) {
        this.#memberIdSet.add(memberId);
        this.memberIds.push(memberId);
      }
    }
  }
}
