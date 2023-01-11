import ApplicationSerializer from './application';
import classic from 'ember-classic-decorator';

@classic
export default class Theme extends ApplicationSerializer {
    primaryKey = 'name';

    attrs = {
        gscanErrors: {key: 'errors'}
    };
}
