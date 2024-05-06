import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class WhatsNewFeatured extends Component {
    @service whatsNew;

    static modalOptions = {
        className: 'fullscreen-modal-action fullscreen-modal-wide fullscreen-modal-whatsnew'
    };

    willDestroy() {
        super.willDestroy(...arguments);
        this.whatsNew.seen();
    }
}
