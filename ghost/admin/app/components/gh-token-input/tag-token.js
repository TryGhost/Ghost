import DraggableObject from 'ember-drag-drop/components/draggable-object';
import classic from 'ember-classic-decorator';
import {attributeBindings, classNameBindings, classNames} from '@ember-decorators/component';
import {computed} from '@ember/object';
import {readOnly} from '@ember/object/computed';

@classic
@attributeBindings('title')
@classNames('tag-token')
@classNameBindings('internal:tag-token--internal')
export default class TagToken extends DraggableObject {
    @readOnly('content.isInternal')
        internal;

    @computed('idx', 'internal')
    get primary() {
        return !this.internal && this.idx === 0;
    }

    @computed('internal')
    get title() {
        return this.internal ? 'Internal tag' : '';
    }
}
