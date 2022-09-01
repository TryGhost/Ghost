import DraggableObject from 'ember-drag-drop/components/draggable-object';
import classic from 'ember-classic-decorator';
import {attributeBindings, classNames} from '@ember-decorators/component';

@classic
@attributeBindings('title')
@classNames('label-token')
export default class LabelToken extends DraggableObject {
    title = 'Label';
}
