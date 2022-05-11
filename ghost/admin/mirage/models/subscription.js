import {Model, belongsTo} from 'miragejs';

export default Model.extend({
    member: belongsTo(),
    tier: belongsTo()
});
