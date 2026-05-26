import logging from '@tryghost/logging';
import {fetchAdvisories, type FeedOptions} from './feed';
import {toNotificationInput, type NotificationInput} from './handler';

interface NotificationsApi {
    add(
        body: {notifications: NotificationInput[]},
        options: {context: {internal: true}}
    ): Promise<unknown>;
}

export interface SecurityAdvisoriesServiceDeps {
    notifications: NotificationsApi;
    ghostVersion: string;
    siteUrl: string;
    fetchImpl?: typeof fetch;
    endpoint?: string;
}

const INTERNAL_CONTEXT = {context: {internal: true}} as const;

export class SecurityAdvisoriesService {
    private readonly deps: SecurityAdvisoriesServiceDeps;

    constructor(deps: SecurityAdvisoriesServiceDeps) {
        this.deps = deps;
    }

    async check(): Promise<void> {
        const feedOptions: FeedOptions = {};
        if (this.deps.fetchImpl) {
            feedOptions.fetchImpl = this.deps.fetchImpl;
        }
        if (this.deps.endpoint) {
            feedOptions.endpoint = this.deps.endpoint;
        }

        let advisories;
        try {
            advisories = await fetchAdvisories(feedOptions);
        } catch (err) {
            logging.warn(
                {
                    event: {name: 'security-advisories.fetch.failed'},
                    err
                },
                'Failed to fetch security advisories'
            );
            return;
        }

        const context = {
            ghostVersion: this.deps.ghostVersion,
            siteUrl: this.deps.siteUrl
        };

        for (const advisory of advisories) {
            const input = toNotificationInput(advisory, context);
            if (!input) {
                continue;
            }
            try {
                await this.deps.notifications.add(
                    {notifications: [input]},
                    INTERNAL_CONTEXT
                );
            } catch (err) {
                logging.error(
                    {
                        event: {name: 'security-advisories.notification.add-failed'},
                        err,
                        ghsaId: advisory.ghsa_id
                    },
                    'Failed to add security advisory notification'
                );
            }
        }
    }
}
