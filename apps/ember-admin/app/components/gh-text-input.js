import TextField from '@ember/component/text-field';
import TextInputMixin from 'ghost-admin/mixins/text-input';
import classic from 'ember-classic-decorator';
import {classNames} from '@ember-decorators/component';

@classic
@classNames('gh-input')
export default class GhTextInput extends TextField.extend(TextInputMixin) {}
