import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class FeaturedWhatsNewModal extends Component {
    @service modals;
    @service whatsNew;

    @action
    closeFeaturedWhatsNew() {
        this.modals.top.close(FeaturedWhatsNewModal);
    }
}
