import Component from '@glimmer/component';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class OnboardingChecklist extends Component {
    @service onboarding;

    @inject config;

    @tracked showMemberTierModal = false;

    get siteUrl() {
        return this.config.blogTitle;
    }
}
