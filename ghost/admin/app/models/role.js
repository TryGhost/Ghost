/* eslint-disable camelcase */
import Model, {attr} from '@ember-data/model';
import {computed} from '@ember/object';

export default Model.extend({
    name: attr('string'),
    description: attr('string'),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),
    createdBy: attr('number'),
    updatedBy: attr('number'),

    lowerCaseName: computed('name', function () {
        return (this.name || '').toLocaleLowerCase();
    })
});
