import { Component } from 'preact';

export default class Pages extends Component {
    constructor(props) {
        super(props);
        this.state = this.getStateFromBrowser();
        window.addEventListener("hashchange", () => this.onHashChange(), false);
        this.handleChange = props.onChange || (() => {});
    }

    getStateFromBrowser() {
        const [fullMatch, hash, query] = window.location.hash.match(/^#([^?]+)\??(.*)$/) || ['#', '', ''];
        return {
            hash,
            query,
            fullMatch
        };
    }

    onHashChange() {
        this.setState(this.getStateFromBrowser());
        this.handleChange();
    }

    filterChildren(children, state) {
        return children.filter((child) => {
            return child.attributes.hash === state.hash;
        }).map((child) => {
            child.attributes.frameLocation = { ...this.state };
            return child;
        });
    }

    render({children, className, onClick}, state) {
        return (
            <div className={className} onClick={onClick}>
                { this.filterChildren(children, state) }
            </div>
        );
    }
}
