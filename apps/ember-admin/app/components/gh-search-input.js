import Component from '@glimmer/component';
import {BILLING_SEARCH_GROUP_KEY} from 'ghost-admin/utils/search';
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

        if (selected.groupKey === BILLING_SEARCH_GROUP_KEY) {
            const adminRoute = this.billing.getAdminRouteForSubRoute(selected.path);

            if (this.router.currentURL === adminRoute) {
                // Ember treats the transition as a no-op (eg. after the billing app
                // rewrote the hash itself via history.replaceState), so the
                // pro-sub route hook won't run — tell the iframe directly
                this.billing.navigateToSubRoute(selected.path);
            } else {
                // the pro route hooks forward the destination to the billing app
                // once the transition succeeds, so an aborted transition (eg.
                // unsaved changes) leaves the billing app untouched
                this.router.transitionTo(adminRoute);
            }

            // billing groups are config-named — never fall through to the
            // groupName-keyed content branches below
            return;
        }

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
    }

    @action
    onClose(select, keyboardEvent) {
        // refocus search input after dropdown is closed (eg, by pressing Escape)
        run.later(() => {
            keyboardEvent?.target.focus();
        });
    }
}
