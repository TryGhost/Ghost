/**
 * This event lets the job manager ask the main thread to start the automation email analytics pipeline.
 */
export class StartAutomationEmailAnalyticsJobEvent {
    readonly timestamp: Date;

    constructor(timestamp: Date) {
        this.timestamp = timestamp;
    }

    static create(timestamp = new Date()) {
        return new StartAutomationEmailAnalyticsJobEvent(timestamp);
    }
};
