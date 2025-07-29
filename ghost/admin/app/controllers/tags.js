import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class TagsController extends Controller {
    @service infinity;
    @service router;
    @service tagsManager;

    queryParams = ['type'];
    @tracked type = 'public';

    get tags() {
        return this.model;
    }

    get filteredTags() {
        return this.tags.filter((tag) => {
            return (!tag.isNew && !tag.isDestroyed && !tag.isDestroying && !tag.isDeleted && (!this.type || tag.visibility === this.type));
        });
    }

    get sortedTags() {
        return this.tagsManager.sortTags(this.filteredTags);
    }

    @action
    changeType(type) {
        this.type = type;
    }

    @action
    newTag() {
        this.router.transitionTo('tag.new');
    }

    @action
    loadMoreTags() {
        this.infinity.infinityLoad(this.model);
    }
}
