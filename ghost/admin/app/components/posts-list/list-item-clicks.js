import Component from '@glimmer/component';
import {action} from '@ember/object';
import {formatPostTime} from 'ghost-admin/helpers/gh-format-post-time';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class PostsListItemClicks extends Component {
    @service feature;
    @service session;
    @service settings;

    @tracked isHovered = false;

    get post() {
        return this.args.post;
    }

    get scheduledText() {
        let text = [];

        let formattedTime = formatPostTime(
            this.post.publishedAtUTC,
            {timezone: this.settings.get('timezone'), scheduled: true}
        );
        text.push(formattedTime);

        return text.join(' ');
    }

    get routeForLink() {
        if (this.post.hasAnalyticsPage) {
            return 'posts.analytics';
        }
        return 'editor.edit';
    }

    get modelsForLink() {
        if (this.post.hasAnalyticsPage) {
            return [this.post];
        }
        return [this.post.displayName, this.post.id];
    }

    @action
    mouseOver() {
        this.isHovered = true;
    }

    @action
    mouseLeave() {
        this.isHovered = false;
    }
}
