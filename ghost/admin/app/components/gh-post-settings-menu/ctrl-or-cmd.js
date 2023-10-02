import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';

const isMac = window.navigator.platform.startsWith('Mac');

export default class CtrlOrCmd extends Component {
    get tooltip() {
        return isMac ? 'Command' : 'Ctrl';
    }

    get character() {
        const character = isMac ? '&#8984;' : '&#8963;';
        return htmlSafe(character);
    }
}
