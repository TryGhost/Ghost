import Model, {attr} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {equal} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Model.extend(ValidationEngine, {
    search: service(),

    validationType: 'tag',

    name: attr('string'),
    slug: attr('string'),
    url: attr('string'),
    description: attr('string'),
    metaTitle: attr('string'),
    metaDescription: attr('string'),
    twitterImage: attr('string'),
    twitterTitle: attr('string'),
    twitterDescription: attr('string'),
    ogImage: attr('string'),
    ogTitle: attr('string'),
    ogDescription: attr('string'),
    codeinjectionHead: attr('string'),
    codeinjectionFoot: attr('string'),
    canonicalUrl: attr('string'),
    accentColor: attr('string'),
    featureImage: attr('string'),
    visibility: attr('string', {defaultValue: 'public'}),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),
    count: attr('raw'),

    isInternal: equal('visibility', 'internal'),
    isPublic: equal('visibility', 'public'),

    feature: service(),

    updateVisibility() {
        let internalRegex = /^#.?/;
        this.set('visibility', internalRegex.test(this.name) ? 'internal' : 'public');
    },

    save() {
        const nameChanged = !!this.changedAttributes().name;

        if (nameChanged && !this.isDeleted) {
            this.updateVisibility();
        }

        const {url} = this;

        return this._super(...arguments).then((savedModel) => {
            const urlChanged = url !== savedModel.url;

            if (nameChanged || urlChanged || this.isDeleted) {
                this.search.expireContent();
            }

            return savedModel;
        });
    }
});
