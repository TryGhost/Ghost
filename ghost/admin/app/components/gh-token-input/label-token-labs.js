import DraggableObject from 'ember-drag-drop/components/draggable-object';
import classic from 'ember-classic-decorator';
import {attributeBindings, classNames} from '@ember-decorators/component';

@classic
@attributeBindings('title')
@classNames('label-token-labs')
export default class LabelTokenLabs extends DraggableObject {
    title = 'Label';
}
