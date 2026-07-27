import Component from '@glimmer/component';

export default class PaidPostPreviewWarningModal extends Component {
    // Three actions don't fit at the default modal width — the button labels
    // get truncated with an ellipsis.
    static modalOptions = {
        className: 'fullscreen-modal-wider fullscreen-modal-action'
    };
}
