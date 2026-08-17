import Modifier from 'ember-modifier';
import {action} from '@ember/object';
import {registerDestructor} from '@ember/destroyable';

export default class OnScrollModifier extends Modifier {
    constructor(owner, args) {
        super(owner, args);
        registerDestructor(this, this.cleanup);
    }

    modify(element, [callback], named) {
        this.elem = element;
        this.callback = callback;
        this.scrollContainer = element;

        if (named.scrollContainer) {
            this.scrollContainer = element.closest(named.scrollContainer);
        }

        this.scrollContainer?.addEventListener('scroll', this.onScroll, {passive: true});
    }

    cleanup = () => {
        this.scrollContainer?.removeEventListener('scroll', this.onScroll, {passive: true});
    };

    @action
    onScroll(event) {
        this.callback(this.elem, this.scrollContainer, event);
    }
}
