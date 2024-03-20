import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {tracked} from '@glimmer/tracking';

export default class OnboardingChecklist extends Component {
    @inject config;
    @tracked customizePublication = false;
    @tracked createPost = false;
    @tracked buildAudience = false;
    @tracked tellWorld = false;

    @tracked showMemberTierModal = false;

    get siteUrl() {
        return this.config.blogTitle;
    }

    @action
    completeStep(step) {
        this.completed = !this.completed;

        switch (step) {
        case 'customizePublication':
            this.customizePublication = !this.customizePublication;
            break;
        case 'createPost':
            this.createPost = !this.createPost;
            break;
        case 'buildAudience':
            this.buildAudience = !this.buildAudience;
            break;
        case 'tellWorld':
            this.tellWorld = !this.tellWorld;
            break;
        default:
            break;
        }
    }

    @action
    closeModal() {
        this.closeModal();
    }
}
