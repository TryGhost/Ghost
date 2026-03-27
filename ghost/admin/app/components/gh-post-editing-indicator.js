import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {get} from '@ember/object';
import {inject as service} from '@ember/service';

const ACTIVE_EDITING_TTL_SECONDS = 120;

export default class GhPostEditingIndicatorComponent extends Component {
    @service clock;
    @service session;

    get activeEditor() {
        // force a recompute while the lease is ticking down
        get(this.clock, 'second');

        const heartbeatAt = this.args.post?.editingHeartbeatAt;
        const editingBy = this.args.post?.editingBy;
        const editingName = this.args.post?.editingName;

        if (!heartbeatAt || !editingBy || editingBy === this.session.user.id) {
            return null;
        }

        if (moment.utc().diff(moment.utc(heartbeatAt), 'seconds') >= ACTIVE_EDITING_TTL_SECONDS) {
            return null;
        }

        return {
            name: editingName || 'Another staff user',
            heartbeatAt: moment.utc(heartbeatAt).toISOString()
        };
    }

    get isListVariant() {
        return this.args.variant === 'list';
    }

    get indicatorClass() {
        return `gh-post-editing-indicator gh-post-editing-indicator--${this.isListVariant ? 'list' : 'editor'}`;
    }

    get indicatorText() {
        if (!this.activeEditor) {
            return null;
        }

        if (this.isListVariant) {
            return `Being edited by ${this.activeEditor.name}`;
        }

        return this.activeEditor.name;
    }

    get indicatorPrefix() {
        if (!this.activeEditor) {
            return null;
        }

        if (this.isListVariant) {
            return null;
        }

        return 'Currently being edited by';
    }

    get editingMember() {
        if (!this.activeEditor) {
            return null;
        }

        return {
            name: this.activeEditor.name,
            avatarImage: this.args.post?.editingAvatar || null
        };
    }
}
