import assert from 'assert/strict';
import events from 'events';
import sinon from 'sinon';
import DomainEvents from '@tryghost/domain-events';
const {
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
            assert.equal(event.data.previous.status, 'published');

            assert.deepEqual(event.data.current.tags[0], {slug: 'tag-current-slug'});
            assert.deepEqual(event.data.previous.tags[0], {slug: 'tag-previous-slug'});
            interceptedEvent = event;
        });

        eventRegistry.emit('post.edited', {
            id: '1234-edited',
            attributes: {
                status: 'draft',
                featured: false,
                published_at: new Date()
            },
            _previousAttributes: {
                status: 'published',
                featured: true
            },
            relations: {
                tags: {
                    models: [{
                        get: function (key: string) {
                            return `tag-current-${key}`;
                        }
                    }]
                }
            },
            _previousRelations: {
                tags: {
                    models: [{
                        get: function (key: string) {
                            return `tag-previous-${key}`;
                        }
                    }]
                }
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

    it('Intercepts unmapped Model event and dispatches nothing', async function () {
        let eventRegistry = new EventRegistry();
        const modelToDomainEventInterceptor = new ModelToDomainEventInterceptor({
            ModelEvents: eventRegistry,
            DomainEvents: DomainEvents
        });

        const domainEventsSpy = sinon.spy(DomainEvents, 'dispatch');

        modelToDomainEventInterceptor.init();

        eventRegistry.emit('tag.added', {
            id: '1234-tag'
        });

        await DomainEvents.allSettled();

        assert.equal(domainEventsSpy.called, false);
    });
});
