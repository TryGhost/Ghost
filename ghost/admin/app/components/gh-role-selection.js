import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const DEFAULT_ROLE_NAME = 'Contributor';

export default class GhRoleSelectionComponent extends Component {
    @service limit;
    @service notifications;
    @service store;

    @tracked roles = [];
    @tracked limitErrorMessage = null;

    @action
    async setRole(roleName) {
        const role = this.roles.findBy('name', roleName);
        this.args.setRole(role);
        return this.validateRole(role);
    }

    @task
    *fetchRolesTask() {
        const roles = yield this.store.query('role', {permissions: 'assign'});
        const defaultRole = roles.findBy('name', DEFAULT_ROLE_NAME);

        this.roles = roles;

        if (!this.args.selected && defaultRole) {
            this.args.setRole(defaultRole);
        }
    }

    async validateRole(role) {
        if (role.name === 'Contributor') {
            this.args.onValidationSuccess?.();
        }

        if (role.name !== 'Contributor'
            && this.limit.limiter
            && this.limit.limiter.isLimited('staff')
        ) {
            try {
                await this.limit.limiter.errorIfWouldGoOverLimit('staff');

                this.limitErrorMessage = null;
                this.args.onValidationSuccess?.();
            } catch (error) {
                if (error.errorType === 'HostLimitError') {
                    this.limitErrorMessage = error.message;
                    this.args.onValidationFailure?.(this.limitErrorMessage);
                } else {
                    this.notifications.showAPIError(error, {key: 'staff.limit'});
                }
            }
        } else {
            this.limitErrorMessage = null;
        }
    }
}
