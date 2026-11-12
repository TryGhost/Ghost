import type { EventProcessingResult } from './event-processing-result';

export type BatchEventProcessor = {
  processBatch(
    // oxlint-disable-next-line ghost/no-any-in-exported-types -- Each processor declares the event fields it reads.
    events: any[],
    result: EventProcessingResult,
    fetchData: { lastEventTimestamp?: Date },
  ): Promise<void>;

  aggregate?: (options: {
    includeOpenedEvents: boolean;
    skipUnchanged?: boolean;
    processingResult: EventProcessingResult;
    isFinal: boolean;
  }) => Promise<null | {
    emailAggregationTimeMs: number;
    memberAggregationTimeMs: number;
  }>;
};
