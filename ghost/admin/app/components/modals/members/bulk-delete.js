import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import fetch from 'fetch';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class BulkDeleteMembersModal extends Component {
    @service ajax;
    @service ghostPaths;

    @tracked error;
    @tracked response;

    get isDisabled() {
        return !this.args.data.query;
    }

    get hasRun() {
        return !!(this.error || this.response);
    }

    @action
    setLabel(label) {
        this.selectedLabel = label;
    }

    @task({drop: true})
    *bulkDeleteTask() {
        try {
            const query = new URLSearchParams(this.args.data.query);

            // Trigger download before deleting. Uses the CSV export endpoint but
            // needs to fetch the file and trigger a download directly rather than
            // via an iframe. The iframe approach can't tell us when a download has
            // started/finished meaning we could end up deleting the data before exporting it
            const exportParams = new URLSearchParams(this.args.data.query);
            exportParams.set('limit', 'all');
            const exportUrl = `${this.ghostPaths.url.api('members/upload')}?${exportParams.toString()}`;

            yield fetch(exportUrl, {method: 'GET'})
                .then(res => res.blob())
                .then((blob) => {
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `members.${moment().format('YYYY-MM-DD')}.csv`;
                    document.body.appendChild(a);

                    if (config.environment !== 'test') {
                        a.click();
                    }

                    a.remove();
                    URL.revokeObjectURL(blobUrl);
                });

            // backup downloaded, continue with deletion

            const deleteUrl = `${this.ghostPaths.url.api('members')}?${query}`;

            // response contains details of which members failed to be deleted
            const response = yield this.ajax.del(deleteUrl);

            this.response = response.meta;

            this.args.data.onComplete?.();

            return true;
        } catch (e) {
            if (e.payload?.errors) {
                this.error = e.payload.errors[0].message;
            } else {
                this.error = 'An unknown error occurred. Please try again.';
            }
            throw e;
        }
    }
}
