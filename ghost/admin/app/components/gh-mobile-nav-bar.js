import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {classNames, tagName} from '@ember-decorators/component';
import {inject as service} from '@ember/service';

@classic
@tagName('nav')
@classNames('gh-mobile-nav-bar')
export default class GhMobileNavBar extends Component {
    @service ui;
}
