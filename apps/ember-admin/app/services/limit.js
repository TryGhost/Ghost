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

        // A subscription without a start can't anchor a period, so it's treated as
        // absent rather than built into one that throws on the way to the count query
        if (this.config.hostSettings?.subscription?.start) {
            subscription = {
                startDate: this.config.hostSettings.subscription.start,
                interval: 'month'
            };
        }

        this.limiter.loadLimits({
            limits: this.decorateWithCountQueries(this.usableLimits(limits, subscription)),
            subscription,
            helpLink,
            errors: {
                HostLimitError,
                IncorrectUsageError
            }
        });
    }

    // Periodic limits need a subscription to build. Registration stops at the first
    // limit that throws, so passing one through would drop every limit after it
    usableLimits(limits, subscription) {
        if (subscription) {
            return limits;
        }

        return Object.fromEntries(Object.entries(limits).filter(([name, limit]) => {
            if (limit && Object.prototype.hasOwnProperty.call(limit, 'maxPeriodic')) {
                console.warn(`Skipping ${name} limit: periodic limits need hostSettings.subscription`); // eslint-disable-line no-console
                return false;
            }

            return true;
        }));
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
        const emails = await this.store.query('email', {filter: `created_at:>='${since}'`, fields: 'id,email_count', limit: 'all'});

        return emails.reduce((total, email) => total + (email.emailCount ?? 0), 0);
    }
}
