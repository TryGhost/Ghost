/* eslint-disable camelcase */
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import {computed} from '@ember/object';

export default Model.extend({
    name: attr('string'),
    description: attr('string'),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),
    createdBy: attr('number'),
    updatedBy: attr('number'),

    lowerCaseName: computed('name', function () {
        return this.get('name').toLocaleLowerCase();
    })
});
