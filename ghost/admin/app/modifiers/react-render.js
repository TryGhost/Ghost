/* global ReactDOM */
import Modifier from 'ember-modifier';
import {createElement} from 'react';

export default class ReactRenderModifier extends Modifier {
    didInstall() {
        const [reactComponent] = this.args.positional;
        const props = this.args.named;

        if (!this.root) {
            this.root = ReactDOM.createRoot(this.element);
        }
        this.root.render(createElement(reactComponent, {...props}));
    }

    willDestroy() {
        if (!this.root) {
            return;
        }

        this.root.unmount();
    }
}
