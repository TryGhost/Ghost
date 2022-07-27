import ReactComponent from './react-component';
import ReactMobiledocEditor from './react-mobiledoc-editor';
import {action} from '@ember/object';

export default class KoenigReactEditor extends ReactComponent {
    @action
    renderComponent(element) {
        this.reactRender(
            element,
            <ReactMobiledocEditor
                mobiledoc={this.args.mobiledoc}
                didCreateEditor={this.args.didCreateEditor}
                onChange={this.args.onChange}
            />
        );
    }
}
