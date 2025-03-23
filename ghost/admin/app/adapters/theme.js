import ApplicationAdapter from './application';

export default class Theme extends ApplicationAdapter {
    activate(model) {
        let url = `${this.buildURL('theme', model.get('id'))}activate/`;

        return this.ajax(url, 'PUT', {data: {}}).then((data) => {
            this.store.pushPayload(data);
            return model;
        });
    }

    active() {
        let url = `${this.buildURL('theme', 'active')}`;

        return this.ajax(url, 'GET', {data: {}}).then((data) => {
            this.store.pushPayload('theme', data);
            return this.store.peekAll('theme').filterBy('name', data.themes[0].name).firstObject;
        });
    }
}
