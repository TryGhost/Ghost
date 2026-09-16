import BaseSerializer from './application';

export default BaseSerializer.extend({
    embed: true,

    keyForCollection() {
        return 'events';
    },

    include() {
        // these are always embedded but will be moved onto the `data` object in the serializer
        return ['member', 'email'];
    },

    serialize() {
        const serialized = BaseSerializer.prototype.serialize.call(this, ...arguments);

        const events = serialized.events.map((serializedEvent) => {
            const data = Object.assign({}, serializedEvent.data, {
                id: serializedEvent.id,
                created_at: serializedEvent.created_at
            });

            if (serializedEvent.member) {
                data.member = serializedEvent.member;
                data.member_id = serializedEvent.member_id;
            }

            if (serializedEvent.email) {
                data.email = serializedEvent.email;
                data.email_id = serializedEvent.email_id;
            }

            return {
                type: serializedEvent.type,
                data
            };
        });

        return {events, meta: serialized.meta};
    }
});
