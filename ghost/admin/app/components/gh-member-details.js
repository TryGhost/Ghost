import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class extends Component {
    @service settings;

    get referrerSource() {
        return this.args.member.get('attribution')?.referrer_source;
    }

    get showAttribution() {
        return this.referrerSource || (this.args.member?.attribution?.url && this.args.member?.attribution?.title);
    }
}
