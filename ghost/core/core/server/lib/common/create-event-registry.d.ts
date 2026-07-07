import {EventEmitter} from 'events';

declare class EventRegistry extends EventEmitter {
    hasRegisteredListener(eventName: string, listenerName: string): boolean;
}

declare function createEventRegistry(): EventRegistry;

export = createEventRegistry;
