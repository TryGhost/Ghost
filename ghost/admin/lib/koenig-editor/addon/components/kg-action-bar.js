import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {computed} from '@ember/object';
import {tagName} from '@ember-decorators/component';

@classic
@tagName('')
export default class KgActionBar extends Component {
    instantClose = false;
    isVisible = false;
    style = null;

    @computed('isVisible', 'instantClose')
    get animationClasses() {
        let {instantClose, isVisible} = this;
        let classes = [];

        if (!instantClose || (instantClose && isVisible)) {
            classes.push('anim-fast-bezier');
        }

        if (!isVisible) {
            classes.push('o-0 pop-down');
        }

        return classes.join(' ');
    }
}
