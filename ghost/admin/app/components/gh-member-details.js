import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class extends Component {
    @service settings;

    get referrerAttribution() {
        const attribution = this.args.member?.attribution;
        return {
            source: attribution?.referrer_source || 'Unknown',
            medium: attribution?.referrer_medium || '-'
        };
    }
}
