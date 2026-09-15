import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import {LimitService, readHostSettings} from '@tryghost/limit-service';
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

        this.loadLimits();
    }

    async checkWouldGoOverLimit(limitName, metadata = {}) {
        return this.limiter.checkWouldGoOverLimit(limitName, metadata);
    }

    loadLimits() {
        let limits = this.config.hostSettings?.limits;

        // A site whose host sends no limits is limited by nothing, including one that used
        // to be: the limits a site has are the limits it was last told about.
        if (!limits) {
            this.limiter = LimitService.unlimited({HostLimitError, IncorrectUsageError});
            return;
        }

        let helpLink;

        if (this.config.hostSettings?.billing?.enabled === true && this.config.hostSettings?.billing?.url) {
            helpLink = this.config.hostSettings.billing?.url;
        } else {
            helpLink = 'https://ghost.org/help/';
        }

        const {settings, rejected} = readHostSettings(this.config.hostSettings);

        for (const limit of rejected) {
            console.warn(`Skipping ${limit.name} limit: ${limit.reason}`); // eslint-disable-line no-console
        }

        this.limiter = new LimitService({
            settings,
            helpLink,
            // How to count is behaviour rather than configuration, so it is passed apart
            // from what the host configured.
            currentCountQueries: {
                staff: bind(this, this.getStaffUsersCount),
                members: bind(this, this.getMembersCount),
                newsletters: bind(this, this.getNewslettersCount),
                emails: bind(this, this.getEmailsCount)
            },
            errors: {
                HostLimitError,
                IncorrectUsageError
            }
        });
    }

    reload() {
        this.loadLimits();
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
        // Only a limit that resets has a period to count within. A host capping emails
        // outright configures a plain maximum instead, and the whole history is what that
        // caps. Formatting the missing date anyway throws, and the publish flow reports
        // whatever it catches, so the publisher is told their sending is disabled because
        // of an invalid time value.
        const query = {fields: 'id,email_count', limit: 'all'};

        if (startDate) {
            query.filter = `created_at:>='${new Date(startDate).toISOString()}'`;
        }

        const emails = await this.store.query('email', query);

        return emails.reduce((total, email) => total + (email.emailCount ?? 0), 0);
    }
}
