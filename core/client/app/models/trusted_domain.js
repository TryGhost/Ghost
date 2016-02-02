/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import DS from 'ember-data';

const {Model, attr, belongsTo} = DS;

export default Model.extend({
    client: belongsTo('client'),
    domain: attr('string')
});
