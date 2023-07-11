import assert from 'assert/strict';
import events from 'events';
import DomainEvents from '@tryghost/domain-events';
const {
    CollectionResourceChangeEvent,
    PostDeletedEvent,
    PostEditedEvent,
    PostAddedEvent
} = require('@tryghost/collections');

import {ModelToDomainEventInterceptor} from '../src';

class EventRegistry extends events.EventEmitter {
    hasRegisteredListener(eventName: string, listenerName: string) {
        return !!(this.listeners(eventName).find(listener => (listener.name === listenerName)));
    }
}

describe('ModelToDomainEventInterceptor', function () {
    it('Can instantiate a ModelToDomainEventInterceptor', function () {
        const modelToDomainEventInterceptor = new ModelToDomainEventInterceptor({
            ModelEvents: new EventRegistry(),
            DomainEvents: DomainEvents
        });

        assert.ok(modelToDomainEventInterceptor);
    });

    it('Starts event listeners after initialization', function () {
        let eventRegistry = new EventRegistry();
        const modelToDomainEventInterceptor = new ModelToDomainEventInterceptor({
            ModelEvents: eventRegistry,
            DomainEvents: DomainEvents
        });

        modelToDomainEventInterceptor.init();

        assert.ok(eventRegistry.hasRegisteredListener('post.added', 'post.added.domainEventInterceptorListener'), 'post.added listener is registered');
    });

    it('Intercepts post.added Model event and dispatches PostAddedEvent Domain event', async function () {
        let eventRegistry = new EventRegistry();
        const modelToDomainEventInterceptor = new ModelToDomainEventInterceptor({
            ModelEvents: eventRegistry,
            DomainEvents: DomainEvents
        });

        modelToDomainEventInterceptor.init();

        let interceptedEvent;
        DomainEvents.subscribe(PostAddedEvent, (event: any) => {
            assert.equal(event.id, '1234-added');
            interceptedEvent = event;
        });

        eventRegistry.emit('post.added', {
            id: '1234-added',
            attributes: {
                status: 'draft',
                featured: false,
                published_at: new Date()
            }
        });

        await DomainEvents.allSettled();

        assert.ok(interceptedEvent);
    });

    it('Intercepts post.edited Model event and dispatches PostEditedEvent Domain event', async function () {
        let eventRegistry = new EventRegistry();
        const modelToDomainEventInterceptor = new ModelToDomainEventInterceptor({
            ModelEvents: eventRegistry,
            DomainEvents: DomainEvents
        });

        modelToDomainEventInterceptor.init();

        let interceptedEvent;
        DomainEvents.subscribe(PostEditedEvent, async (event: any) => {
            assert.equal(event.id, '1234-edited');
            assert.ok(event.data);
            assert.ok(event.data.current);
            assert.equal(event.data.current.status, 'draft');

            interceptedEvent = event;
        });

        eventRegistry.emit('post.edited', {
            id: '1234-edited',
            attributes: {
                status: 'draft',
                featured: false,
                published_at: new Date()
            }
        });

        await DomainEvents.allSettled();

        assert.ok(interceptedEvent);
    });

    it('Intercepts post.deleted Model event and dispatches PostAddedEvent Domain event', async function () {
        let eventRegistry = new EventRegistry();
        const modelToDomainEventInterceptor = new ModelToDomainEventInterceptor({
            ModelEvents: eventRegistry,
            DomainEvents: DomainEvents
        });

        modelToDomainEventInterceptor.init();

        let interceptedEvent;
        DomainEvents.subscribe(PostDeletedEvent, (event: any) => {
            assert.equal(event.id, '1234-deleted');
            interceptedEvent = event;
        });

        eventRegistry.emit('post.deleted', {
            id: '1234-deleted'
        });

        await DomainEvents.allSettled();

        assert.ok(interceptedEvent);
    });

    it('Intercepts unmapped Model event and dispatches CollectionResourceChangeEvent Domain event', async function () {
        let eventRegistry = new EventRegistry();
        const modelToDomainEventInterceptor = new ModelToDomainEventInterceptor({
            ModelEvents: eventRegistry,
            DomainEvents: DomainEvents
        });

        modelToDomainEventInterceptor.init();

        let interceptedEvent;
        DomainEvents.subscribe(CollectionResourceChangeEvent, (event: any) => {
            assert.equal(event.name, 'user.activated.edited');
            assert.equal(event.data.id, '1234-user-edit');
            interceptedEvent = event;
        });

        eventRegistry.emit('user.activated.edited', {
            id: '1234-user-edit'
        });

        await DomainEvents.allSettled();

        assert.ok(interceptedEvent);
    });
});
