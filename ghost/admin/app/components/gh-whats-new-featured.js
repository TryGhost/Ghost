import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class WhatsNewFeatured extends Component {
    @service whatsNew;

    willDestroy() {
        super.willDestroy();
        this.whatsNew.closeFeaturedModal();
    }
}