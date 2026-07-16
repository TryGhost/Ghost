type EventProcessingResultInput = Partial<Omit<EventProcessingResult, 'totalEvents' | 'merge'>>;

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

    // processing failures are counted separately in addition to event type counts
    processingFailures: number = 0;

    // ids seen whilst processing ready for passing to stats aggregator
    emailIds: string[] = [];
    memberIds: string[] = [];

    constructor(result: EventProcessingResultInput = {}) {
        this.merge(result);
    }

    get totalEvents(): number {
        return this.delivered
            + this.opened
            + this.temporaryFailed
            + this.permanentFailed
            + this.unsubscribed
            + this.complained
            + this.unhandled
            + this.unprocessable;
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

        // TODO: come up with a cleaner way to merge these without churning through Array and Set
        this.emailIds = Array.from(new Set([...this.emailIds, ...(other.emailIds || [])])).filter(Boolean);
        this.memberIds = Array.from(new Set([...this.memberIds, ...(other.memberIds || [])])).filter(Boolean);
    }
}
