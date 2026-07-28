import Component from '@glimmer/component';
import {GHOST_PRO_GROUP_NAME} from 'ghost-admin/utils/search';
import {action} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class GhSearchInputComponent extends Component {
    @service billing;
    @service router;
    @service search;

    @action
    openSelected(selected) {
        if (!selected) {
            return;
        }

        this.args.onSelected?.(selected);

        if (selected.groupName === 'Posts') {
            let id = selected.id.replace('post.', '');
            this.router.transitionTo('lexical-editor.edit', 'post', id);
        }

        if (selected.groupName === 'Pages') {
            let id = selected.id.replace('page.', '');
            this.router.transitionTo('lexical-editor.edit', 'page', id);
        }

        if (selected.groupName === 'Staff') {
            let id = selected.id.replace('user.', '');
            this.router.transitionTo(`/settings/staff/${id}`);
        }

        if (selected.groupName === 'Tags') {
            let id = selected.id.replace('tag.', '');
            this.router.transitionTo('tag', id);
        }

        if (selected.groupName === GHOST_PRO_GROUP_NAME) {
            if (this.router.currentURL === selected.path) {
                // Ember treats the transition as a no-op (eg. after the BMA
                // rewrote the hash itself via history.replaceState), so the
                // pro-sub route hook won't run — tell the iframe directly
                this.billing.navigateToSubRoute(selected.path.replace(/^\/pro/, ''));
            } else {
                // the pro-sub route forwards the destination to the BMA iframe
                // once the transition succeeds, so an aborted transition (eg.
                // unsaved changes) leaves the billing app untouched
                this.router.transitionTo(selected.path);
            }
        }
    }

    @action
    onClose(select, keyboardEvent) {
        // refocus search input after dropdown is closed (eg, by pressing Escape)
        run.later(() => {
            keyboardEvent?.target.focus();
        });
    }
}
