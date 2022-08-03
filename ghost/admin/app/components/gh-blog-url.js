import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {inject as service} from '@ember/service';
import {tagName} from '@ember-decorators/component';

@classic
@tagName('')
export default class GhBlogUrl extends Component {
    @service config;
}
