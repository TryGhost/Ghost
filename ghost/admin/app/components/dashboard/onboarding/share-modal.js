import Component from '@glimmer/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {inject} from 'ghost-admin/decorators/inject';
import {task} from 'ember-concurrency';

export default class OnboardingShareModal extends Component {
    @inject config;

    static modalOptions = {
        backgroundBlur: true
    };

    get encodedUrl() {
        return encodeURIComponent(this.config.blogUrl);
    }

    @task
    *copySiteUrl() {
        yield copyTextToClipboard(this.config.blogUrl);
        return true;
    }
}
