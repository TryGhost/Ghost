/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import DS from 'ember-data';

const {computed} = Ember;
const {Model, attr} = DS;

export default Model.extend({
    uuid: attr('string'),
    name: attr('string'),
    description: attr('string'),
    created_at: attr('moment-date'),
    updated_at: attr('moment-date'),
    created_by: attr(),
    updated_by: attr(),

    lowerCaseName: computed('name', function () {
        return this.get('name').toLocaleLowerCase();
    })
});
