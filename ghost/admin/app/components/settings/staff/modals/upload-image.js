import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class UploadImageModal extends Component {
    @service notifications;

    @tracked errorMessage;
    @tracked isUploading = false;
    @tracked url = '';

    constructor() {
        super(...arguments);
        this.url = this._getModelProperty();
    }

    @action
    fileUploaded(url) {
        this.url = url;
    }

    @action
    removeImage() {
        this.url = '';
    }

    @task({drop: true})
    *uploadImageTask() {
        this._setModelProperty(this.url);

        try {
            yield this.args.data.model.save();
        } catch (e) {
            this.notifications.showAPIError(e, {key: 'image.upload'});
        } finally {
            this.args.close();
        }
    }

    _getModelProperty() {
        const {model, modelProperty} = this.args.data;
        return model[modelProperty];
    }

    _setModelProperty(url) {
        const {model, modelProperty} = this.args.data;
        model[modelProperty] = url;
        return url;
    }
}
