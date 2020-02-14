import DraggableObject from 'ember-drag-drop/components/draggable-object';

export default DraggableObject.extend({

    attributeBindings: ['title'],
    classNames: ['label-token'],

    title: 'Label'

});
