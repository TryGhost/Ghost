import Component from '@glimmer/component';
import {action} from '@ember/object';
import {formatPostTime} from 'ghost-admin/helpers/gh-format-post-time';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhPostsListItemComponent extends Component {
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

    @action
    mouseOver() {
        this.isHovered = true;
    }

    @action
    mouseLeave() {
        this.isHovered = false;
    }
}
