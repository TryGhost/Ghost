import BaseSerializer from './application';

export default BaseSerializer.extend({
    embed: true,

    include(request) {
        let queryIncludes = (request.queryParams.include || '').split(',').compact();
        const includes = new Set(queryIncludes);

        // embedded records that are included by default in the API
        includes.add('labels');
        includes.add('subscriptions');

        return Array.from(includes);
    },

    serialize() {
        const serialized = BaseSerializer.prototype.serialize.call(this, ...arguments);

        // comped subscriptions are returned with a blank ID
        // (we use `.comped` internally because mirage resources require an ID)
        (serialized.members || [serialized.member]).forEach((member) => {
            member.subscriptions.forEach((sub) => {
                if (sub.comped) {
                    sub.id = '';
                }
                delete sub.comped;
            });
        });

        return serialized;
    }
});
