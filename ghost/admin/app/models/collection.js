import Model from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {attr} from '@ember-data/model';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Model.extend(ValidationEngine, {
    validationType: 'collection',

    title: attr('string'),
    slug: attr('string'),
    description: attr('string'),
    type: attr('string', {defaultValue: 'manual'}),
    filter: attr('string'),
    featureImage: attr('string'),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),
    createdBy: attr('number'),
    updatedBy: attr('number'),
    count: attr('raw'),

    posts: attr('raw'),

    postIds: computed('posts', function () {
        if (this.posts && this.posts.length) {
            return this.posts.map(post => post.id);
        } else {
            return [];
        }
    }),

    feature: service()
});
