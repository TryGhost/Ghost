import type {EventProcessingResult} from './event-processing-result';

export type BatchEventProcessor = {
    processBatch(
        events: any[],
        result: EventProcessingResult,
        fetchData: {lastEventTimestamp?: Date}
    ): Promise<void>;

    aggregate?: (options: {
        includeOpenedEvents: boolean;
        processingResult: EventProcessingResult;
        isFinal: boolean;
    }) => Promise<null | {
        emailAggregationTimeMs: number;
        memberAggregationTimeMs: number;
    }>;
};
