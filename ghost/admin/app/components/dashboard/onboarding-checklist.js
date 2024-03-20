import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class OnboardingChecklist extends Component {
    @tracked customizePublication = false;
    @tracked createPost = false;
    @tracked buildAudience = false;
    @tracked tellWorld = false;

    @tracked showMemberTierModal = false;

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
