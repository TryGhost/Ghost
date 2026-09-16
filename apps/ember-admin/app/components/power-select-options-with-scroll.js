import OptionsComponent from 'ember-power-select/components/power-select/options';
import {action} from '@ember/object';

export default class PowerSelectOptionsWithScroll extends OptionsComponent {
    @action
    addHandlers(element) {
        super.addHandlers(element);

        if (element.getAttribute('role') === 'group') {
            return;
        }

        this._scrollHandler = () => {
            const threshold = 100;
            if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
                this.args.lastReached?.();
            }
        };
        element.addEventListener('scroll', this._scrollHandler);
    }

    @action
    removeHandlers(element) {
        super.removeHandlers(element);
        if (this._scrollHandler) {
            element.removeEventListener('scroll', this._scrollHandler);
        }
    }
}
