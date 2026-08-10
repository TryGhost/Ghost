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
    @service membersCountCache;

    @inject config;

    constructor() {
        super(...arguments);

        this.limiter = new LimitService();
        this.loadLimits();
    }

    async checkWouldGoOverLimit(limitName, metadata = {}) {
        return this.limiter.checkWouldGoOverLimit(limitName, metadata);
    }

    loadLimits() {
        let limits = this.config.hostSettings?.limits;

        if (!limits) {
            return;
        }

        let helpLink;

        if (this.config.hostSettings?.billing?.enabled === true && this.config.hostSettings?.billing?.url) {
            helpLink = this.config.hostSettings.billing?.url;
        } else {
            helpLink = 'https://ghost.org/help/';
        }

        let subscription;

        if (this.config.hostSettings?.subscription) {
            subscription = {
                startDate: this.config.hostSettings.subscription.start,
                interval: 'month'
            };
        }

        try {
            this.limiter.loadLimits({
                limits: this.decorateWithCountQueries(limits),
                subscription,
                helpLink,
                errors: {
                    HostLimitError,
                    IncorrectUsageError
                }
            });
        } catch (error) {
            // A limit that can't be built stops the whole load, so tolerate it here
            // like the server does rather than leaving Admin with no limits at all
            if (error?.errorType !== 'IncorrectUsageError') {
                throw error;
            }

            console.warn(`Host limits not loaded: ${error.message}`); // eslint-disable-line no-console
        }
    }

    reload() {
        this.loadLimits();
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

        if (limits.emails) {
            limits.emails.currentCountQuery = bind(this, this.getEmailsCount);
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
        return this.membersCountCache.count({});
    }

    async getNewslettersCount() {
        const activeNewsletters = await this.store.query('newsletter', {filter: 'status:active', limit: 'all'});
        return activeNewsletters.length;
    }

    // Periodic limits pass the period start as the second argument. The default
    // emails query counts recipients via knex, which doesn't exist in the browser
    async getEmailsCount(_db, startDate) {
        const since = new Date(startDate).toISOString();
        const emails = await this.store.query('email', {filter: `created_at:>='${since}'`, limit: 'all'});

        return emails.reduce((total, email) => total + (email.emailCount ?? 0), 0);
    }
}
