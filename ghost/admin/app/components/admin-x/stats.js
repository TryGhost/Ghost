import AdminXComponent from './admin-x-component';
import {inject as service} from '@ember/service';

export default class Stats extends AdminXComponent {
    @service upgradeStatus;

    additionalProps = () => {
        return {
            appSettings: {
                paidMembersEnabled: this.settings.paidMembersEnabled,
                analytics: {
                    emailTrackOpens: this.settings.emailTrackOpens,
                    emailTrackClicks: this.settings.emailTrackClicks,
                    membersTrackSources: this.settings.membersTrackSources,
                    outboundLinkTagging: this.settings.outboundLinkTagging,
                    webAnalytics: this.feature.trafficAnalytics && (this.settings.webAnalytics ?? false)
                }
            }
        };
    };

    static packageName = '@tryghost/stats';
}
