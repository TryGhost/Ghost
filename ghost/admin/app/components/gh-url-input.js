import Component from '@glimmer/component';
import {action} from '@ember/object';

function ensureEndsWith(string, endsWith) {
    return string.endsWith(endsWith) ? string : string + endsWith;
}

function removeLeadingSlash(string) {
    return string.replace(/^\//, '');
}

export default class GhUrlInput extends Component {
    constructor(owner, args) {
        super(owner, args);
        this.baseUrl = ensureEndsWith(args.baseUrl, '/');
        this.value = args.value && args.value !== '/' ? (new URL(removeLeadingSlash(args.value), this.baseUrl)).href : '';
        this.setResult = args.setResult;
        this.validateUrl = args.validateUrl;
        this.placeholder = args.placeholder;
    }

    @action
    setValue(event) {
        this.value = event.target.value;
        this.setResult(this.result);
    }

    @action
    validateUrlInput() {
        this.validateUrl(this.result);
    }

    get result() {
        try {
            return new URL(removeLeadingSlash(this.value), this.baseUrl);
        } catch (err) {
            return null;
        }
    }
}
