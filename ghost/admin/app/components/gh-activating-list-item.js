import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {classNameBindings, tagName} from '@ember-decorators/component';
import {schedule} from '@ember/runloop';

@classic
@classNameBindings('active')
@tagName('li')
export default class GhActivatingListItem extends Component {
    active = false;
    linkClasses = null;

    @action
    setActive(value) {
        schedule('afterRender', this, function () {
            this.set('active', value);
        });
    }

    click() {
        this.element.querySelector('a').blur();
    }
}
