import ValidationStatusContainer from 'ghost-admin/components/gh-validation-status-container';
import classic from 'ember-classic-decorator';
import {classNames} from '@ember-decorators/component';

@classic
@classNames('form-group')
export default class GhFormGroup extends ValidationStatusContainer {}
