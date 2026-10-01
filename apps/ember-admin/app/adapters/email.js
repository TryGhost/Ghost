import ApplicationAdapter from './application';

export default class Email extends ApplicationAdapter {
    sendingStatus(model) {
        const url = `${this.buildURL('email', model.get('id'))}status/`;
        return this.ajax(url, 'GET').then(data => data.email_statuses?.[0]?.sending);
    }

    retry(model) {
        const url = `${this.buildURL('email', model.get('id'))}retry/`;

        return this.ajax(url, 'PUT', {data: {}}).then((data) => {
            this.store.pushPayload(data);
            return model;
        });
    }
}
