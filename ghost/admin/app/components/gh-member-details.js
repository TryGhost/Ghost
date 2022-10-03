import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class extends Component {
    @service settings;

    get referrerSource() {
        const source = this.args.member.get('attribution')?.referrer_source;
        return source === 'Created manually' ? null : source;
    }

    get showAttribution() {
        return this.referrerSource || (this.args.member?.get('attribution')?.url && this.args.member?.get('attribution')?.title);
    }
}
