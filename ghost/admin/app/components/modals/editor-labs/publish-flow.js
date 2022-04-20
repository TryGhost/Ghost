import Component from '@glimmer/component';

export default class PublishModalComponent extends Component {
    static modalOptions = {
        className: 'fullscreen-modal-total-overlay',
        omitBackdrop: true
    };
}
