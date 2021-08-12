import DraggableObject from 'ember-drag-drop/components/draggable-object';

export default DraggableObject.extend({

    attributeBindings: ['title'],
    classNames: ['label-token-labs'],

    title: 'Label'

});
