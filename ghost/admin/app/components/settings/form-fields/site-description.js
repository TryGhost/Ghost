import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SiteDescriptionFormField extends Component {
    @service settings;

    @action
    update(event) {
        this.settings.set('description', event.target.value);
    }

    @action
    async validate(event) {
        const value = event.target.value;
        this.settings.set('description', value);
        await this.settings.validate({property: 'description'});
        this.args.didUpdate('description', value);
    }
}
