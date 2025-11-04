import AdminXComponent from './admin-x-component';
import {getOwner} from '@ember/application';
import {inject as service} from '@ember/service';

export default class Comments extends AdminXComponent {
    @service session;

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
                    webAnalytics: this.settings.webAnalyticsEnabled
                }
            }
        };
    };

    static packageName = '@tryghost/posts';
}
