import Modifier from 'ember-modifier';
import React from 'react';
import ReactDOM from 'react-dom';
import {createRoot} from 'react-dom/client';

// make globals available for any pulled in UMD components
// - avoids external components needing to bundle React and running into multiple version errors
window.React = React;
window.ReactDOM = ReactDOM;

export default class ReactRenderModifier extends Modifier {
    didInstall() {
        const [reactComponent] = this.args.positional;
        const props = this.args.named;

        if (!this.root) {
            this.root = createRoot(this.element);
        }
        this.root.render(React.createElement(reactComponent, {...props}));
    }

    willDestroy() {
        if (!this.root) {
            return;
        }

        this.root.unmount();
    }
}
