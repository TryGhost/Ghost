import DraggableObject from 'ember-drag-drop/components/draggable-object';
import {computed} from '@ember/object';
import {readOnly} from '@ember/object/computed';

export default DraggableObject.extend({

    attributeBindings: ['title'],
    classNames: ['tag-token'],
    classNameBindings: [
        'internal:tag-token--internal'
    ],

    internal: readOnly('content.isInternal'),

    primary: computed('idx', 'internal', function () {
        return !this.get('internal') && this.get('idx') === 0;
    }),

    title: computed('internal', function () {
        if (this.get('internal')) {
            return `Internal tag`;
        }
    })

});
