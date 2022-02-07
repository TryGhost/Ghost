import Modifier from 'ember-modifier';
import {inject as service} from '@ember/service';

export default class MovableModifier extends Modifier {
    @service resizeDetector;

    didInstall() {
        this.resizeDetector.setup(this.element, this.args.positional[0]);
    }

    willDestroy() {
        this.resizeDetector.teardown(this.element, this.args.positional[0]);
    }
}
