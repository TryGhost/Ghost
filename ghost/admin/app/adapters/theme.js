import ApplicationAdapter from './application';
import classic from 'ember-classic-decorator';

@classic
export default class Theme extends ApplicationAdapter {
    activate(model) {
        let url = `${this.buildURL('theme', model.get('id'))}activate/`;

        return this.ajax(url, 'PUT', {data: {}}).then((data) => {
            this.store.pushPayload(data);
            return model;
        });
    }
}
