/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import computed from 'ember-computed';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
    uuid: attr('string'),
    name: attr('string'),
    description: attr('string'),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),
    createdBy: attr(),
    updatedBy: attr(),

    lowerCaseName: computed('name', function () {
        return this.get('name').toLocaleLowerCase();
    })
});
