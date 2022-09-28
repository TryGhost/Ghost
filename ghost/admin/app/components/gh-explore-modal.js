import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

@classic
export default class GhExploreModal extends Component {
    @service explore;

    @computed('exploreWindowOpen')
    get visibilityClass() {
        return this.exploreWindowOpen ? 'gh-explore' : 'gh-explore closed';
    }
}
