import DraggableObject from 'ember-drag-drop/components/draggable-object';
import {computed} from '@ember/object';
import {readOnly} from '@ember/object/computed';

export default DraggableObject.extend({

    attributeBindings: ['title'],
    classNames: ['tag-token'],
    classNameBindings: [
        'primary:tag-token--primary',
        'internal:tag-token--internal'
    ],

    content: readOnly('option'),
    internal: readOnly('option.isInternal'),

    primary: computed('idx', 'internal', function () {
        return !this.get('internal') && this.get('idx') === 0;
    }),

    title: computed('option.name', 'primary', 'internal', function () {
        let name = this.get('option.name');

        if (this.get('internal')) {
            return `${name} (internal)`;
        }

        if (this.get('primary')) {
            return `${name} (primary tag)`;
        }

        return name;
    })

});
