import Controller from '@ember/controller';
import {alias, sort} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Controller.extend({
    router: service(),

    queryParams: ['type'],
    type: 'public',

    tags: alias('model'),

    filteredTags: computed('tags.@each.isNew', 'type', function () {
        return this.tags.filter((tag) => {
            return (!tag.isNew && (!this.type || tag.visibility === this.type));
        });
    }),

    // tags are sorted by name
    sortedTags: sort('filteredTags', function (tagA, tagB) {
        // ignorePunctuation means the # in internal tag names is ignored
        return tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true});
    }),

    actions: {
        changeType(type) {
            this.set('type', type);
        },

        newTag() {
            this.router.transitionTo('tag.new');
        }
    }
});
