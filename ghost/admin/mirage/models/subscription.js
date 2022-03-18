import {Model, belongsTo} from 'miragejs';

export default Model.extend({
    member: belongsTo(),
    product: belongsTo()
});
