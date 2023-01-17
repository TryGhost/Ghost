import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Mention extends ApplicationAdapter {
    queryRecord() {
        let url = this.buildURL('mentions');
        return this.ajax(url, 'GET');
    }
}
