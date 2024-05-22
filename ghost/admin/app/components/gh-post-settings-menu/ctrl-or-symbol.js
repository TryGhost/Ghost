import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';

const isMac = window.navigator.platform.startsWith('Mac');

export default class CtrlOrCmd extends Component {
    get tooltip() {
        return isMac ? 'Control' : '';
    }

    get character() {
        const character = isMac ? '&#8963;' : 'Ctrl';
        return htmlSafe(character);
    }

    get class() {
        return isMac ? '' : 'mono';
    }
}
