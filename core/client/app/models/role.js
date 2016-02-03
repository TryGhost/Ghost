/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';

const {computed} = Ember;

export default Model.extend({
    uuid: attr('string'),
    name: attr('string'),
    description: attr('string'),
    createdAt: attr('moment-date'),
    updatedAt: attr('moment-date'),
    createdBy: attr(),
    updatedBy: attr(),

    lowerCaseName: computed('name', function () {
        return this.get('name').toLocaleLowerCase();
    })
});
