import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class TagsController extends Controller {
    @service router;

    queryParams = ['type'];
    @tracked type = 'public';

    get tags() {
        return this.model;
    }

    get filteredTags() {
        return this.tags.filter((tag) => {
            return (!tag.isNew && (!this.type || tag.visibility === this.type));
        });
    }

    get sortedTags() {
        return this.filteredTags.sort((tagA, tagB) => {
            // ignorePunctuation means the # in internal tag names is ignored
            return tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true});
        });
    }

    @action
    changeType(type) {
        this.type = type;
    }

    @action
    newTag() {
        this.router.transitionTo('tag.new');
    }
}
