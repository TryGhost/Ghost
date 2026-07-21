/**
 * This is an event that is used to circumvent the job manager that currently isn't able to run scheduled jobs on the main thread (not offloaded).
 * We simply emit this event in the job manager and listen for it on the main thread.
 */
export class StartEmailAnalyticsJobEvent {
    readonly timestamp: Date;

    constructor(timestamp: Date) {
        this.timestamp = timestamp;
    }

    static create(timestamp = new Date()) {
        return new StartEmailAnalyticsJobEvent(timestamp);
    }
};
