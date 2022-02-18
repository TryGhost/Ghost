import {Model, belongsTo} from 'ember-cli-mirage';

export default Model.extend({
    product: belongsTo('product')
});
