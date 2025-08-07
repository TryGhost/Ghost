import AdminXComponent from './admin-x-component';
import {inject as service} from '@ember/service';

export default class Stats extends AdminXComponent {
    @service upgradeStatus;
    @service onboarding;

    additionalProps = () => {
        return {
            appSettings: {
                paidMembersEnabled: this.settings.paidMembersEnabled,
                newslettersEnabled: this.settings.editorDefaultEmailRecipients !== 'disabled',
                analytics: {
                    emailTrackOpens: this.settings.emailTrackOpens,
                    emailTrackClicks: this.settings.emailTrackClicks,
                    membersTrackSources: this.settings.membersTrackSources,
                    outboundLinkTagging: this.settings.outboundLinkTagging,
                    webAnalytics: this.settings.webAnalyticsEnabled // use the computed setting
                }
            }
        };
    };

    static packageName = '@tryghost/stats';
}
