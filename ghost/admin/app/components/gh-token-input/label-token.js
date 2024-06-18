import DraggableObject from 'ember-drag-drop/components/draggable-object';
import classic from 'ember-classic-decorator';
import {alias} from '@ember/object/computed';
import {attributeBindings, classNames} from '@ember-decorators/component';
import {computed} from '@ember/object';

@classic
@attributeBindings('title')
@classNames('label-token')
export default class LabelToken extends DraggableObject {
    @alias('content.name') name;

    @computed('name')
    get title() {
        return this.name ?? 'Label';
    }
}
