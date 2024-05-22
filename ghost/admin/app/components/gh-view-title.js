import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {classNames, tagName} from '@ember-decorators/component';
import {inject as service} from '@ember/service';

@classic
@tagName('h2')
@classNames('view-title')
export default class GhViewTitle extends Component {
    @service ui;
}
