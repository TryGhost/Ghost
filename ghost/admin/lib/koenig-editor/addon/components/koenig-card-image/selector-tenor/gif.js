import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';

export default class GhTenorGifComponent extends Component {
    get media() {
        return this.args.gif.media_formats.tinygif;
    }

    get imageUrl() {
        return this.media.url;
    }

    get width() {
        return this.media.dims[0];
    }

    get height() {
        return this.media.dims[1];
    }

    get style() {
        return htmlSafe(this.args.zoomed ? 'width: auto; margin: 0' : '');
    }

    get containerStyle() {
        if (!this.args.gif) {
            return htmlSafe('');
        }

        const styles = [];
        const ratio = this.args.gif.ratio;

        styles.push(`padding-bottom: ${ratio * 100}%`);

        return htmlSafe(styles.join('; '));
    }
}
