import Component from '@glimmer/component';
import {get} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PostsListContentFilter extends Component {
    @service customViews;
    @service feature;
    @service router;

    get showCustomViewManagement() {
        const isAdmin = get(this.args.currentUser || {}, 'isAdmin');
        const onPostsScreen = this.router.currentRouteName === 'posts';
        const isDefaultView = this.customViews?.activeView?.isDefault;
        const hasFilter = this.args.selectedType.value
            || this.args.selectedVisibility.value
            || this.args.selectedAuthor.slug
            || this.args.selectedTag.slug
            || this.args.selectedOrder.value;

        return isAdmin && onPostsScreen && !isDefaultView && hasFilter;
    }

    calculateActionsDropdownPosition(trigger, content) {
        const {top, left, width, height} = trigger.getBoundingClientRect();
        // content.firstElementChild is required because we use .dropdown-menu which is absolute positioned
        const {width: contentWidth} = content.firstElementChild.getBoundingClientRect();

        const style = {
            left: left + width - contentWidth,
            top: top + height + 5
        };

        return {style};
    }
}
