import Controller from '@ember/controller';
import {inject as injectService} from '@ember/service';

export default Controller.extend({
    settings: injectService()
});
