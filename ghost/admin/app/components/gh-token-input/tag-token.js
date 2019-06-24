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
        return !this.internal && this.idx === 0;
    }),

    title: computed('internal', function () {
        return this.internal ? 'Internal tag' : '';
    })

});
