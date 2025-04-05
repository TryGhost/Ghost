import Modifier from 'ember-modifier';
import {registerDestructor} from '@ember/destroyable';
import {inject as service} from '@ember/service';

export default class CloseDropdownsOnClickModifier extends Modifier {
    @service dropdown;

    constructor(owner, args) {
        super(owner, args);
        registerDestructor(this, this.cleanup);

        function onClick() {
            this.dropdown.closeDropdowns();
        }
        this.onClick = onClick.bind(this);
    }

    modify(element) {
        if (element.tagName === 'IFRAME') {
            element.addEventListener('load', () => {
                this.element = element.contentDocument;
                this.element.addEventListener('click', this.onClick);
            });
        } else {
            this.element = element;
            this.element.addEventListener('click', this.onClick);
        }
    }

    cleanup = () => {
        this.element?.removeEventListener('click', this.onClick);
    };
}