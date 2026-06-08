import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {classNames, tagName} from '@ember-decorators/component';

@classic
@tagName('h2')
@classNames('view-title')
export default class GhViewTitle extends Component {
}
