import {PostDeletedEvent} from '@tryghost/post-events';
import {PostAddedEvent, PostEditedEvent, TagDeletedEvent} from '@tryghost/collections';

type ModelToDomainEventInterceptorDeps = {
    ModelEvents: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hasRegisteredListener: (event: any, listenerName: string) => boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        on: (eventName: string, callback: (data: any) => void) => void;
    },
    DomainEvents: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch: (event: any) => void;
    }
}

export class ModelToDomainEventInterceptor {
    ModelEvents;
    DomainEvents;

    constructor(deps: ModelToDomainEventInterceptorDeps) {
        this.ModelEvents = deps.ModelEvents;
        this.DomainEvents = deps.DomainEvents;
    }

    init() {
        const ghostModelUpdateEvents = [
            'post.added',
            'post.deleted',
            'post.edited',
            // NOTE: currently unmapped and unused event
            'tag.added',
            'tag.deleted'
        ];

        for (const modelEventName of ghostModelUpdateEvents) {
            if (!this.ModelEvents.hasRegisteredListener(modelEventName, 'collectionListener')) {
                const dispatcher = this.domainEventDispatcher.bind(this);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const listener = function (data: any) {
                    dispatcher(modelEventName, data);
                };
                Object.defineProperty(listener, 'name', {value: `${modelEventName}.domainEventInterceptorListener`, writable: false});

                this.ModelEvents.on(modelEventName, listener);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    domainEventDispatcher(modelEventName: string, data: any) {
        let event;

        switch (modelEventName) {
        case 'post.deleted':
            event = PostDeletedEvent.create({
                id: data.id || data._previousAttributes?.id
            });
            break;
        case 'post.added':
            event = PostAddedEvent.create({
                id: data.id,
                featured: data.attributes.featured,
                status: data.attributes.status,
                published_at: data.attributes.published_at
            });
            break;
        case 'post.edited':
            event = PostEditedEvent.create({
                id: data.id,
                current: {
                    id: data.id,
                    title: data.attributes.title,
                    status: data.attributes.status,
                    featured: data.attributes.featured,
                    published_at: data.attributes.published_at,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    tags: data.relations?.tags?.models.map((tag: any) => ({
                        slug: tag.get('slug')
                    }))
                },
                // @NOTE: this will need to represent the previous state of the post
                //        will be needed to optimize the query for the collection
                previous: {
                    id: data.id,
                    title: data._previousAttributes?.title,
                    status: data._previousAttributes?.status,
                    featured: data._previousAttributes?.featured,
                    published_at: data._previousAttributes?.published_at,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    tags: data._previousRelations?.tags?.models.map((tag: any) => ({
                        slug: tag.get('slug')
                    }))
                }
            });
            break;
        case 'tag.deleted':
            event = TagDeletedEvent.create({
                id: data.id || data._previousAttributes?.id,
                slug: data.attributes?.slug || data._previousAttributes?.slug
            });
            break;
        default:
        }

        if (event) {
            this.DomainEvents.dispatch(event);
        }
    }
}
