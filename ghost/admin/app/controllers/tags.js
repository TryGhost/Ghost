import Controller, {inject as controller} from '@ember/controller';
import {alias, sort} from '@ember/object/computed';
import {computed} from '@ember/object';

export default Controller.extend({

    tagController: controller('tags.tag'),

    queryParams: ['type'],
    type: 'public',
    tags: alias('model'),
    selectedTag: alias('tagController.tag'),

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
        }
    }
});
