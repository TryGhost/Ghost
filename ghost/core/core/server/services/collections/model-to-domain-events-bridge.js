const DomainEvents = require('@tryghost/domain-events');
const {
    CollectionResourceChangeEvent,
    PostDeletedEvent,
    PostAddedEvent,
    PostEditedEvent
} = require('@tryghost/collections');

const domainEventDispatcher = (modelEventName, data) => {
    const change = Object.assign({}, {
        id: data.id,
        resource: modelEventName.split('.')[0]
    }, data._changed);

    let event;
    if (modelEventName === 'post.deleted') {
        event = PostDeletedEvent.create({id: data.id});
    } if (modelEventName === 'post.added') {
        event = PostAddedEvent.create({
            id: data.id,
            featured: data.featured,
            status: data.attributes.status,
            published_at: data.published_at
        });
    } if (modelEventName === 'post.edited') {
        event = PostEditedEvent.create({
            id: data.id,
            current: {
                id: data.id,
                title: data.attributes.title,
                status: data.attributes.status,
                featured: data.attributes.featured,
                published_at: data.attributes.published_at
            },
            // @NOTE: this will need to represent the previous state of the post
            //        will be needed to optimize the query for the collection
            previous: {
            }
        });
    } else {
        event = CollectionResourceChangeEvent.create(modelEventName, change);
    }

    DomainEvents.dispatch(event);
};

const translateModelEventsToDomainEvents = () => {
    const events = require('../../lib/common/events');
    const ghostModelUpdateEvents = [
        'post.added',
        'post.deleted',
        'post.edited',

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

    for (const modelEvent of ghostModelUpdateEvents) {
        if (!events.hasRegisteredListener(modelEvent, 'collectionListener')) {
            events.on(modelEvent, data => domainEventDispatcher(modelEvent, data));
        }
    }
};

module.exports = translateModelEventsToDomainEvents;
