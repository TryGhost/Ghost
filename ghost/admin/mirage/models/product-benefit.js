import {Model, belongsTo} from 'miragejs';

export default Model.extend({
    product: belongsTo('product')
});
