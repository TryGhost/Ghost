/* global ReactDOM */
import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class ReactComponent extends Component {
    @action
    renderComponent() {
        // eslint-disable-next-line
        console.error('Components extending ReactComponent must implement a `renderComponent()` action that calls `this.reactRender()');
    }

    /**
     * Renders a react component as the current ember element
     * @param {React.Component} reactComponent. e.g., <HelloWorld />
     */
    reactRender(element, reactComponent) {
        if (element !== this.elem) {
            this.unmountReactElement();
        }

        this.elem = element;
        this.root = ReactDOM.createRoot(this.elem);
        this.root.render(reactComponent);
    }

    /**
     * Removes a mounted React component from the DOM and
     * cleans up its event handlers and state.
     */
    unmountReactElement() {
        if (!this.root) {
            return;
        }

        this.root.unmount();
    }

    /**
     * Cleans up the rendered react component as the ember
     * component gets destroyed
     */
    willDestroy() {
        super.willDestroy();
        this.unmountReactElement();
    }
}
