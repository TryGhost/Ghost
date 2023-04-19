import LimitService from '@tryghost/limit-service';
import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import {bind} from '@ember/runloop';
import {inject} from 'ghost-admin/decorators/inject';

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
    @service store;
    @service membersStats;

    @inject config;

    constructor() {
        super(...arguments);

        let limits = this.config.hostSettings?.limits;

        this.limiter = new LimitService();

        if (!limits) {
            return;
        }

        let helpLink;

        if (this.config.hostSettings?.billing?.enabled === true && this.config.hostSettings?.billing?.url) {
            helpLink = this.config.hostSettings.billing?.url;
        } else {
            helpLink = 'https://ghost.org/help/';
        }

        this.limiter.loadLimits({
            limits: this.decorateWithCountQueries(limits),
            helpLink,
            errors: {
                HostLimitError,
                IncorrectUsageError
            }
        });
    }

    async checkWouldGoOverLimit(limitName, metadata = {}) {
        return this.limiter.checkWouldGoOverLimit(limitName, metadata);
    }

    decorateWithCountQueries(limits) {
        if (limits.staff) {
            limits.staff.currentCountQuery = bind(this, this.getStaffUsersCount);
        }

        if (limits.members) {
            limits.members.currentCountQuery = bind(this, this.getMembersCount);
        }

        if (limits.newsletters) {
            limits.newsletters.currentCountQuery = bind(this, this.getNewslettersCount);
        }

        return limits;
    }

    async getStaffUsersCount() {
        return RSVP.hash({
            users: this.store.findAll('user', {reload: true}),
            invites: this.store.findAll('invite', {reload: true}),
            roles: this.store.findAll('role', {reload: true}) // NOTE: roles have to be fetched as they are not always loaded with invites
        }).then((data) => {
            const staffUsers = data.users.filter(u => u.get('status') !== 'inactive' && u.role.get('name') !== 'Contributor');
            const staffInvites = data.invites.filter(i => i.role.get('name') !== 'Contributor');

            return staffUsers.length + staffInvites.length;
        });
    }

    async getMembersCount() {
        const members = await this.store.query('member', {limit: 1});
        const total = members.meta.pagination.total;

        return total;
    }

    async getNewslettersCount() {
        const activeNewsletters = await this.store.query('newsletter', {filter: 'status:active', limit: 'all'});
        return activeNewsletters.length;
    }
}
