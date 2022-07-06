import Controller from '@ember/controller';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {alias, sort} from '@ember/object/computed';
import {inject as service} from '@ember/service';

@classic
export default class TagsController extends Controller {
    @service router;

    queryParams = ['type'];
    type = 'public';

    @alias('model')
        tags;

    @computed('tags.@each.isNew', 'type')
    get filteredTags() {
        return this.tags.filter((tag) => {
            return (!tag.isNew && (!this.type || tag.visibility === this.type));
        });
    }

    // tags are sorted by name
    @sort('filteredTags', function (tagA, tagB) {
        // ignorePunctuation means the # in internal tag names is ignored
        return tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true});
    })
        sortedTags;

    @action
    changeType(type) {
        this.set('type', type);
    }

    @action
    newTag() {
        this.router.transitionTo('tag.new');
    }
}
