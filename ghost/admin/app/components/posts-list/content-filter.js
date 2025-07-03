import Component from '@glimmer/component';
import {action, get} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PostsListContentFilter extends Component {
    @service customViews;
    @service feature;
    @service router;
    @service tagsManager;

    get showCustomViewManagement() {
        let isAdmin = get(this.args.currentUser || {}, 'isAdmin');
        let onPostsScreen = this.router.currentRouteName === 'posts';
        let isDefaultView = this.customViews?.activeView?.isDefault;
        let hasFilter = this.args.selectedType.value
            || this.args.selectedVisibility.value
            || this.args.selectedAuthor.slug
            || this.args.selectedTag.slug
            || this.args.selectedOrder.value;

        return isAdmin && onPostsScreen && !isDefaultView && hasFilter;
    }

    calculateActionsDropdownPosition(trigger, content) {
        let {top, left, width, height} = trigger.getBoundingClientRect();
        // content.firstElementChild is required because we use .dropdown-menu which is absolute positioned
        let {width: contentWidth} = content.firstElementChild.getBoundingClientRect();

        let style = {
            left: left + width - contentWidth,
            top: top + height + 5
        };

        return {style};
    }

    @action
    registerTagsPowerSelect(api) {
        this.tagsPowerSelectApi = api;
    }

    @action
    onLastReached() {
        const search = this.tagsPowerSelectApi?.searchText;
        this.args.loadMoreTagsTask.perform(!!search);
    }
}
