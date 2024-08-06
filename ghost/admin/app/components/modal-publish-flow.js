import ModalComponent from 'ghost-admin/components/modal-base';
import {inject as service} from '@ember/service';

export default class ModalPublishFlow extends ModalComponent {
    @service store;

    classNames = ['modal-publish-flow', ...this.classNames];

    get post() {
        return this.model.post;
    }

    get postCount() {
        return this.model.postCount;
    }
}
