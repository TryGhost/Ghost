import Modifier from 'ember-modifier';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {registerDestructor} from '@ember/destroyable';

export default class ReactRenderModifier extends Modifier {
    constructor(owner, args) {
        super(owner, args);
        registerDestructor(this, this.cleanup);
    }

    modify(element, [reactComponent], {props}) {
        if (!this.root) {
            this.root = createRoot(element);
        }

        this.root.render(React.createElement(reactComponent, {...props}));
    }

    cleanup = () => {
        if (!this.root) {
            return;
        }

        this.root.unmount();
    };
}
