import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import {action, get} from '@ember/object';
import {formatPostTime} from 'ghost-admin/helpers/gh-format-post-time';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhEditorPostStatusComponent extends Component {
    @service clock;
    @service settings;

    @tracked isHovered = false;

    @tracked _isSaving = false;

    // this.args.isSaving will only be true briefly whilst the post is saving,
    // we want to ensure that the "Saving..." message is shown for at least
    // a few seconds so that it's noticeable so we use autotracking to trigger
    // a task that sets _isSaving to true for 3 seconds
    get isSaving() {
        if (this.args.isSaving) {
            this.showSavingMessage.perform();
        }

        return this._isSaving;
    }

    get scheduledTime() {
        // force a recompute every second
        get(this.clock, 'second');

        return formatPostTime(
            this.args.post.publishedAtUTC,
            {timezone: this.settings.get('timezone'), scheduled: true}
        );
    }

    @action
    onMouseover() {
        this.isHovered = true;
    }

    @action
    onMouseleave() {
        this.isHovered = false;
    }

    @task({drop: true})
    *showSavingMessage() {
        this._isSaving = true;
        yield timeout(config.environment === 'test' ? 0 : 3000);

        if (!this.isDestroyed && !this.isDestroying) {
            this._isSaving = false;
        }
    }
}
