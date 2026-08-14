import {Resource} from 'ember-could-get-used-to-this';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

class MemberFetcher extends Resource {
    @service store;

    @tracked loadedMember = null;

    get value() {
        return this.loadedMember;
    }

    async setup() {
        const [memberId] = this.args.positional;

        if (!memberId) {
            return;
        }

        const record = await this.store.findRecord('member', memberId);
        this.loadedMember = record;
    }
}

export default MemberFetcher;
