import urlUtils from '../../../shared/url-utils';
import {oneAtATime} from '../../../shared/one-at-a-time';
import {getSignedAdminToken} from '../../adapters/scheduling/utils';
import StartAutomationsPollEvent from './events/start-automations-poll-event';
import {poll} from './poll';
import memberWelcomeEmailService from '../member-welcome-emails/service';
import type DomainEvents from '@tryghost/domain-events';

type SchedulerAdapter = {
    schedule(job: {
        time: number;
        url: string;
        extra: {
            httpMethod: string;
        };
    }): void;
};

type SchedulerIntegration = {
    api_keys: Array<{
        id: string;
        secret: string;
    }>;
};

class AutomationsService {
    #initialized = false;

    init({domainEvents, apiUrl, schedulerAdapter, schedulerIntegration}: {
        domainEvents: Pick<DomainEvents, 'dispatch' | 'subscribe'>;
        apiUrl: string;
        schedulerAdapter: SchedulerAdapter;
        schedulerIntegration: SchedulerIntegration;
    }): void {
        if (this.#initialized) {
            return;
        }

        const enqueuePollNow = () => {
            domainEvents.dispatch(StartAutomationsPollEvent.create());
        };

        const enqueuePollAt = (date: Readonly<Date>) => {
            const signedAdminToken = getSignedAdminToken({
                publishedAt: date.toISOString(),
                apiUrl,
                integration: schedulerIntegration
            });
            const url = new URL(urlUtils.urlJoin(apiUrl, 'automations', 'poll'));
            url.searchParams.set('token', signedAdminToken);
            schedulerAdapter.schedule({
                time: date.getTime(),
                url: url.toString(),
                extra: {
                    httpMethod: 'PUT'
                }
            });
        };

        domainEvents.subscribe(StartAutomationsPollEvent, oneAtATime(async () => {
            await poll({
                memberWelcomeEmailService,
                enqueueAnotherPollNow: enqueuePollNow,
                enqueueAnotherPollAt: enqueuePollAt
            });
        }));

        enqueuePollNow();

        this.#initialized = true;
    }
}

module.exports = AutomationsService;
