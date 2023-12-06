import {MilestoneCreatedEvent} from '@tryghost/milestones';
import {SlackNotifications} from '@tryghost/slack-notifications';
import {HandleEvent} from '../common/handle-event.decorator';
import {Inject} from '@nestjs/common';

interface IConfig {
    // TODO: pass better config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(key: string): any
}

export class SlackNotificationsListener {
    service: typeof SlackNotifications;
    private readonly enabled: boolean;
    constructor(@Inject('SlackNotifications') service: typeof SlackNotifications, @Inject('config') config: IConfig) {
        this.service = service;
        const hostSettings = config.get('hostSettings');
        this.enabled = hostSettings?.milestones?.url && hostSettings?.milestones?.enabled;
    }

    @HandleEvent(MilestoneCreatedEvent)
    async notifyMilestones(event: typeof MilestoneCreatedEvent) {
        if (!this.enabled) {
            return;
        }
        try {
            await this.service.notifyMilestoneReceived(event.data);
        } catch (error) {
            // TODO sort out logging
            // eslint-disable-next-line no-console
            console.error(error);
        }
    }
};
