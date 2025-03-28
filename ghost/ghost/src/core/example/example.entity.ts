/**
 * Entity
 *
 * Represents a "Business Object" in the system
 *
 *  - As much business logic as possible should be here
 *  - Its interface should describe what it is and what it can do/you can do to it.
 *  - Handles the creation of events related to the entity
 */
import {Entity} from '../../common/entity.base';
import {ExampleEvent} from './example.event';

type GreetingData = {
    greeting: string
};

export class Greeting extends Entity<GreetingData> {
    get greeting() {
        return this.attr.greeting;
    }

    set greeting(greeting: string) {
        this.set('greeting', greeting);
    }

    greet(recipient: string) {
        let message;
        if (recipient.trim() === 'world') {
            message = 'Hello, world!';
        } else {
            message = `${this.greeting}, ${recipient.trim()}.`;
        }
        this.addEvent(ExampleEvent.create({
            message
        }));
        return message;
    }
}
