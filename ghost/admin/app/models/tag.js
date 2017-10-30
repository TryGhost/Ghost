/* eslint-disable camelcase */
import Model from 'ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import attr from 'ember-data/attr';
import {computed} from '@ember/object';
import {equal} from '@ember/object/computed';
import {guidFor} from '@ember/object/internals';
import {observer} from '@ember/object';
import {inject as service} from '@ember/service';

export default Model.extend(ValidationEngine, {
    validationType: 'tag',

    name: attr('string'),
    slug: attr('string'),
    description: attr('string'),
    parent: attr(),
    metaTitle: attr('string'),
    metaDescription: attr('string'),
    featureImage: attr('string'),
    visibility: attr('string', {defaultValue: 'public'}),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),
    createdBy: attr(),
    updatedBy: attr(),
    count: attr('raw'),

    isInternal: equal('visibility', 'internal'),
    isPublic: equal('visibility', 'public'),

    feature: service(),

    // HACK: ugly hack to main compatibility with selectize as used in the
    // PSM tags input
    // TODO: remove once we've switched over to EPS for the tags input
    uuid: computed(function () {
        return guidFor(this);
    }),

    setVisibility() {
        let internalRegex = /^#.?/;
        this.set('visibility', internalRegex.test(this.get('name')) ? 'internal' : 'public');
    },

    save() {
        if (this.get('changedAttributes.name') && !this.get('isDeleted')) {
            this.setVisibility();
        }
        return this._super(...arguments);
    },

    setVisibilityOnNew: observer('isNew', 'isSaving', 'name', function () {
        if (this.get('isNew') && !this.get('isSaving')) {
            this.setVisibility();
        }
    }).on('init')
});
