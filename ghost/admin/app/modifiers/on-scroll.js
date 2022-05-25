import Modifier from 'ember-modifier';
import {action} from '@ember/object';

export default class OnScrollModifier extends Modifier {
    @action
    onScroll(event) {
        this.args.positional[0](this.element, this.scrollContainer, event);
    }

    didInstall() {
        this.scrollContainer = this.element;

        if (this.args.named.scrollContainer) {
            this.scrollContainer = this.element.closest(this.args.named.scrollContainer);
        }

        this.scrollContainer?.addEventListener('scroll', this.onScroll, {passive: true});
    }

    willDestroy() {
        this.scrollContainer?.removeEventListener('scroll', this.onScroll, {passive: true});
    }
}
