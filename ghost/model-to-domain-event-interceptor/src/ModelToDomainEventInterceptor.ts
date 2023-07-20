const {
    CollectionResourceChangeEvent,
    PostDeletedEvent,
    PostAddedEvent,
    PostEditedEvent
} = require('@tryghost/collections');

type ModelToDomainEventInterceptorDeps = {
    ModelEvents: {
        hasRegisteredListener: (event: any, listenerName: string) => boolean;
        on: (eventName: string, callback: (data: any) => void) => void;
    },
    DomainEvents: {
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

            // @NOTE: uncomment events below once they have appropriate DomainEvent to map to
            // 'tag.added',
            // 'tag.edited',
            // 'tag.attached',
            // 'tag.detached',
            // 'tag.deleted',

            // 'user.activated',
            'user.activated.edited'
            // 'user.attached',
            // 'user.detached',
            // 'user.deleted'
        ];

        for (const modelEventName of ghostModelUpdateEvents) {
            if (!this.ModelEvents.hasRegisteredListener(modelEventName, 'collectionListener')) {
                const dispatcher = this.domainEventDispatcher.bind(this);
                const listener = function (data: any) {
                    dispatcher(modelEventName, data);
                };
                Object.defineProperty(listener, 'name', {value: `${modelEventName}.domainEventInterceptorListener`, writable: false});

                this.ModelEvents.on(modelEventName, listener);
            }
        }
    }

    domainEventDispatcher(modelEventName: string, data: any) {
        const change = Object.assign({}, {
            id: data.id,
            resource: modelEventName.split('.')[0]
        }, data._changed);

        let event;

        switch (modelEventName) {
        case 'post.deleted':
            event = PostDeletedEvent.create({id: data.id});
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
                    tags: data.relations?.tags?.models.map((tag: any) => (tag.get('slug')))
                },
                // @NOTE: this will need to represent the previous state of the post
                //        will be needed to optimize the query for the collection
                previous: {
                    id: data.id,
                    title: data._previousAttributes?.title,
                    status: data._previousAttributes?.status,
                    featured: data._previousAttributes?.featured,
                    published_at: data._previousAttributes?.published_at,
                    tags: data._previousRelations?.tags?.models.map((tag: any) => (tag.get('slug')))
                }
            });
            break;
        default:
            event = CollectionResourceChangeEvent.create(modelEventName, change);
        }

        this.DomainEvents.dispatch(event);
    }
}
