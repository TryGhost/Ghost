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

    get scheduledText() {
        let {post} = this.args;
        let text = [];

        let formattedTime = formatPostTime(
            post.publishedAtUTC,
            {timezone: this.settings.get('timezone'), scheduled: true}
        );
        text.push(formattedTime);

        return text.join(' ');
    }

    get isAnalytics() {
        return ((!this.session.user.isContributor) && this.args.post.isPost && (this.args.post.isSent || this.args.post.isPublished) && (this.settings.get('emailTrackClicks') || this.feature.get('memberAttribution')));
    }

    get routeForLink() {
        if (this.isAnalytics) {
            return 'posts.analytics';
        }
        return 'editor.edit';
    }

    get modelsForLink() {
        if (this.isAnalytics) {
            return [this.args.post];
        }
        return [this.args.post.displayName, this.args.post.id];
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
