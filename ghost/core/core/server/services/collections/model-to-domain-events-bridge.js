const DomainEvents = require('@tryghost/domain-events');
const {
    CollectionResourceChangeEvent
} = require('@tryghost/collections');

const domainEventDispatcher = (modelEventName, data) => {
    const change = Object.assign({}, {
        id: data.id,
        resource: modelEventName.split('.')[0]
    }, data._changed);
    const collectionResourceChangeEvent = CollectionResourceChangeEvent.create(modelEventName, change);

    DomainEvents.dispatch(collectionResourceChangeEvent);
};

const translateModelEventsToDomainEvents = () => {
    const events = require('../../lib/common/events');
    const ghostModelUpdateEvents = [
        'post.published',
        'post.published.edited',
        'post.unpublished',
        'tag.added',
        'tag.edited',
        'tag.attached',
        'tag.detached',
        'tag.deleted',
        'user.activated',
        'user.activated.edited',
        'user.attached',
        'user.detached',
        'user.deleted'
    ];

    for (const modelEvent of ghostModelUpdateEvents) {
        if (!events.hasRegisteredListener(modelEvent, 'collectionListener')) {
            events.on(modelEvent, data => domainEventDispatcher(modelEvent, data));
        }
    }
};

module.exports = translateModelEventsToDomainEvents;
