import Component from '@glimmer/component';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {tracked} from '@glimmer/tracking';

export default class GhMediaLibraryPhoto extends Component {
    @tracked height = 0;
    @tracked width = 1200;

    // get containerStyle() {
    //     const styles = [];
    //     const ratio = this.args.photo.ratio;

    //     styles.push(`padding-bottom: ${ratio * 100}%`);

    //     return htmlSafe(styles.join('; '));
    // }

    constructor() {
        super(...arguments);
        this.height = this.width * this.args.photo.ratio;
    }

    @action
    select(event) {
        event.preventDefault();
        event.stopPropagation();

        this.args.select(this.args.photo);
    }
}
