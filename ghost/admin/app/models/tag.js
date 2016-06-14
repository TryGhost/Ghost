/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

const {
    computed,
    observer,
    inject: {service}
} = Ember;

const {equal} = computed;

export default Model.extend(ValidationEngine, {
    validationType: 'tag',

    uuid: attr('string'),
    name: attr('string'),
    slug: attr('string'),
    description: attr('string'),
    parent: attr(),
    metaTitle: attr('string'),
    metaDescription: attr('string'),
    image: attr('string'),
    visibility: attr('string', {defaultValue: 'public'}),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),
    createdBy: attr(),
    updatedBy: attr(),
    count: attr('raw'),

    isInternal: equal('visibility', 'internal'),
    isPublic: equal('visibility', 'public'),

    feature: service(),

    setVisibility() {
        let internalRegex = /^#.?/;

        this.set('visibility', internalRegex.test(this.get('name')) ? 'internal' : 'public');
    },

    save() {
        if (this.get('feature.internalTags') && this.get('changedAttributes.name') && !this.get('isDeleted')) {
            this.setVisibility();
        }
        return this._super(...arguments);
    },

    setVisibilityOnNew: observer('feature.internalTags', 'isNew', 'isSaving', 'name', function () {
        if (this.get('isNew') && !this.get('isSaving') && this.get('feature.internalTags')) {
            this.setVisibility();
        }
    })
});
