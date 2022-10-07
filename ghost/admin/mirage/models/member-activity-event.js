import {Model, belongsTo} from 'miragejs';

export default Model.extend({
    email: belongsTo(),
    member: belongsTo()
});
