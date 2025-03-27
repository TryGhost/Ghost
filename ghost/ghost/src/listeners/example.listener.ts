/**
 * Listener
 *
 * Responsible for mapping events to perform actions on the service/provider layer.
 * - "Like a Controller, but for Events not HTTP Requests"
 */
import {OnEvent} from '../common/decorators/handle-event.decorator';
import {Inject} from '@nestjs/common';
import {ExampleEvent} from '../core/example/example.event';

interface Logger {
    info(message: string): void
}

export class ExampleListener {
    constructor(
        @Inject('logger') private logger: Logger
    ) {}

    @OnEvent(ExampleEvent)
    async logEvents(event: ExampleEvent) {
        this.logger.info(`Received an event with a message: ${event.data.message}`);
    }
}
