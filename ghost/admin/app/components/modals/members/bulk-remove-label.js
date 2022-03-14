import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class BulkRemoveMembersLabelModal extends Component {
    @service ajax;
    @service ghostPaths;

    @tracked error;
    @tracked response;
    @tracked selectedLabel;

    get isDisabled() {
        return !this.args.data.query || !this.selectedLabel;
    }

    get hasRun() {
        return !!(this.error || this.response);
    }

    @action
    setLabel(label) {
        this.selectedLabel = label;
    }

    @task({drop: true})
    *removeLabelTask() {
        try {
            const query = new URLSearchParams(this.args.data.query);
            const removeLabelUrl = `${this.ghostPaths.url.api('members/bulk')}?${query}`;
            const response = yield this.ajax.put(removeLabelUrl, {
                data: {
                    bulk: {
                        action: 'removeLabel',
                        meta: {
                            label: {
                                id: this.selectedLabel
                            }
                        }
                    }
                }
            });

            this.args.data.onComplete?.();

            this.response = response?.bulk?.meta;

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
