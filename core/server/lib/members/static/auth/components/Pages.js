import { Component } from 'preact';

export default class Pages extends Component {
    constructor(props) {
        super(props);
        this.state = this.getStateFromBrowser();
        window.addEventListener("hashchange", () => this.onHashChange(), false);
        this.handleChange = props.onChange || (() => { });
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

    render({ children, className, onClick, stripeConfig }, state) {
        let modalClassName = "gm-modal gm-auth-modal";
        if (state.hash === 'signup' && stripeConfig) {
            modalClassName += " gm-subscribe-modal"
        }
        return (
            <div className={className} onClick={onClick}>
                <div className="gm-modal-container">
                    <div className={modalClassName} onClick={(e) => e.stopPropagation()}>
                        {this.filterChildren(children, state)}
                    </div>
                </div>
            </div>
        );
    }
}
