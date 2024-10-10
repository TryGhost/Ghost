/**
 * Event
 *
 * Represents an "Business Event" in the system
 *
 * They are serialisable (only contain data)
 */
import {BaseEvent} from '../../common/event.base';

type ExampleEventData = {
    message: string
};

export class ExampleEvent extends BaseEvent<ExampleEventData> {
    static create(data: ExampleEventData) {
        return new ExampleEvent(data, new Date());
    }
}
