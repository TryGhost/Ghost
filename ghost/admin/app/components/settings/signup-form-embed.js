import Component from '@glimmer/component';
import SignupFormEmbedModal from '../../components/modals/settings/signup-form-embed';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SignupFormEmbed extends Component {
    @service modals;
    @service settings;

    @action
    open() {
        this.modals.open(SignupFormEmbedModal, {}, {});
    }
}
