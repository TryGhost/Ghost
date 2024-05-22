import Modifier from 'ember-modifier';
import {registerDestructor} from '@ember/destroyable';
import {inject as service} from '@ember/service';

export default class MovableModifier extends Modifier {
    @service resizeDetector;

    constructor(owner, args) {
        super(owner, args);
        registerDestructor(this, this.cleanup);
    }

    modify(element, [callback]) {
        if (!this.didSetup) {
            this.elem = element;
            this.callback = callback;

            this.resizeDetector.setup(element, callback);

            this.didSetup = true;
        }
    }

    cleanup = () => {
        this.resizeDetector.teardown(this.elem, this.callback);
    };
}
