import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class GhExploreModal extends Component {
    @service explore;

    get visibilityClass() {
        return this.explore.exploreWindowOpen ? 'gh-explore' : 'gh-explore closed';
    }
}
