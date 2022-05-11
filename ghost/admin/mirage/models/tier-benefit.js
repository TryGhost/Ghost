import {Model, belongsTo} from 'miragejs';

export default Model.extend({
    tier: belongsTo('tier')
});
