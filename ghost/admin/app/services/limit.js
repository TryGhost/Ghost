import LimitService from '@tryghost/limit-service';
import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import {bind} from '@ember/runloop';

class LimitError {
    constructor({errorType, errorDetails, message}) {
        this.errorType = errorType;
        this.errorDetails = errorDetails;
        this.message = message;
    }
}

class IncorrectUsageError extends LimitError {
    constructor(options) {
        super(Object.assign({errorType: 'IncorrectUsageError'}, options));
    }
}

class HostLimitError extends LimitError {
    constructor(options) {
        super(Object.assign({errorType: 'HostLimitError'}, options));
    }
}

export default class LimitsService extends Service {
    @service config;
    @service store;
    @service membersStats;

    constructor() {
        super(...arguments);

        let limits = this.config.get('hostSettings.limits');

        if (limits && !this.limiter) {
            this.limiter = new LimitService();

            let helpLink;

            if (this.config.get('hostSettings.billing.enabled')
                && this.config.get('hostSettings.billing.enabled') === true
                && this.config.get('hostSettings.billing.url')) {
                helpLink = this.config.get('hostSettings.billing.url');
            } else {
                helpLink = 'https://ghost.org/help/';
            }

            return this.limiter.loadLimits({
                limits: this.decorateWithCountQueries(limits),
                helpLink,
                errors: {
                    HostLimitError,
                    IncorrectUsageError
                }
            });
        }
    }

    decorateWithCountQueries(limits) {
        if (limits.staff) {
            limits.staff.currentCountQuery = bind(this, this.getStaffUsersCount);
        }

        if (limits.members) {
            limits.members.currentCountQuery = bind(this, this.getMembersCount);
        }

        return limits;
    }

    async getStaffUsersCount() {
        return RSVP.hash({
            users: this.store.findAll('user', {reload: true}),
            invites: this.store.findAll('invite', {reload: true})
        }).then((data) => {
            const staffUsers = data.users.filter(u => u.get('status') !== 'inactive' && u.role.get('name') !== 'Contributor');
            const staffInvites = data.invites.filter(i => i.role.get('name') !== 'Contributor');

            return staffUsers.length + staffInvites.length;
        });
    }

    async getMembersCount() {
        const counts = await this.membersStats.fetchCounts();

        return counts.total;
    }
}
