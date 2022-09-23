import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import moment from 'moment-timezone';
import {computed} from '@ember/object';
import {tagName} from '@ember-decorators/component';

@classic
@tagName('')
export default class GhUserActive extends Component {
    user = null;

    @computed('user.lastLoginUTC')
    get lastLoginUTC() {
        let lastLoginUTC = this.get('user.lastLoginUTC');

        return lastLoginUTC ? moment(lastLoginUTC).fromNow() : '(Never)';
    }
}
