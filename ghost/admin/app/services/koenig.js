import Service from '@ember/service';
import fetchKoenigLexical from '../utils/fetch-koenig-lexical';
import {task} from 'ember-concurrency';

export default class Koenig extends Service {
    get resource() {
        let status = 'pending';
        let response;

        const suspender = this.fetch().then(
            (res) => {
                status = 'success';
                response = res;
            },
            (err) => {
                status = 'error';
                response = err;
            }
        );

        const read = () => {
            switch (status) {
            case 'pending':
                throw suspender;
            case 'error':
                throw response;
            default:
                return response;
            }
        };

        return {read};
    }

    async fetch() {
        // avoid re-fetching whilst already fetching
        if (this._fetchTask.isRunning) {
            return await this._fetchTask.last;
        }

        // avoid re-fetching if we've already fetched successfully
        if (this._fetchTask.lastSuccessful) {
            return this._fetchTask.lastSuccessful.value;
        }

        // kick-off a new fetch
        return await this._fetchTask.perform();
    }

    @task
    *_fetchTask() {
        return yield fetchKoenigLexical();
    }
}
