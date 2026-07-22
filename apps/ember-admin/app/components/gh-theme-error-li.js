import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {tagName} from '@ember-decorators/component';

@classic
@tagName('')
export default class GhThemeErrorLi extends Component {
    error = null;
    showDetails = false;

    @action
    toggleDetails() {
        this.toggleProperty('showDetails');
    }
}
