import { Component } from 'preact';
import { IconClose, GhostLogo } from './icons';

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

    render({ children, className, onClick, stripeConfig, siteConfig }, state) {
        let modalClassName = "gm-modal gm-auth-modal";
        if (state.hash === 'signup' && stripeConfig) {
            modalClassName += " gm-subscribe-modal"
        }
        let iconUrl = siteConfig && siteConfig.icon;
        let title = (siteConfig && siteConfig.title) || "Ghost Publication";
        let iconStyle = iconUrl ? {
            backgroundImage: `url(${iconUrl})`,
            backgroundSize: `38px`
        } : {};
        return (
            <div className={className}>
                <div className="gm-modal-header">
                    <div className="gm-logo" style={iconStyle}></div>
                    <h2>{title}</h2>
                </div>
                <div className="gm-modal-close" onClick={ onClick }>{IconClose}</div>
                <div className="gm-modal-container">
                    <div className={modalClassName} onClick={(e) => e.stopPropagation()}>
                        {this.filterChildren(children, state)}
                    </div>
                </div>
                <div className="gm-powered-by">
                    <a href="https://ghost.org" target="_blank"><span>Powered by</span> {GhostLogo}</a>
                </div>
            </div>
        );
    }
}
