import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';

export default class GhImageUploaderWithPreviewComponent extends Component {
    @tracked isEditingAlt = false;
    @tracked captionInputFocused = false;
}
