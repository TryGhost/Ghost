import Modifier from 'ember-modifier';
import {action} from '@ember/object';
import {registerDestructor} from '@ember/destroyable';

export default class SelectOnClickModifier extends Modifier {
    modify(element) {
        element.addEventListener('click', this.onClick);
        registerDestructor(this, () => {
            element.removeEventListener('click', this.onClick);
        });
    }

    @action
    onClick(event) {
        event.currentTarget.select();
    }
}
