let inited = false;

module.exports.init = async () => {
    if (inited) {
        return;
    }
    inited = true;

    const DomainEvents = require('@tryghost/domain-events/lib/DomainEvents');
    const {ModelToDomainEventInterceptor} = require('@tryghost/model-to-domain-event-interceptor');
    const events = require('../../lib/common/events');
    const eventInterceptor = new ModelToDomainEventInterceptor({
        ModelEvents: events,
        DomainEvents: DomainEvents
    });

    eventInterceptor.init();
};
