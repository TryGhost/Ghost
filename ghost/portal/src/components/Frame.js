import React, {Component} from 'react';
import {createPortal} from 'react-dom';

export default class Frame extends Component {
    componentDidMount() {
        this.node.addEventListener('load', this.handleLoad);
    }

    handleLoad = () => {
        this.setupFrameBaseStyle();
    };

    componentWillUnmout() {
        this.node.removeEventListener('load', this.handleLoad);
    }

    setupFrameBaseStyle() {
        this.iframeHtml = this.node.contentDocument.documentElement;
        this.iframeHtml.style.fontSize = '62.5%';
        this.iframeHtml.style.height = '100%';

        this.iframeHead = this.node.contentDocument.head;
        this.iframeRoot = this.node.contentDocument.body;
        this.iframeRoot.style.margin = '0px';
        this.iframeRoot.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
        this.iframeRoot.style.fontSize = '1.6rem';
        this.iframeRoot.style.height = '100%';
        this.iframeRoot.style.lineHeight = '1.6em';
        this.iframeRoot.style.fontWeight = '400';
        this.iframeRoot.style.fontStyle = 'normal';
        this.iframeRoot.style.color = '#333';
        this.forceUpdate();
    }

    render() {
        const {children, head, title = '', style = {}, ...rest} = this.props;
        return (
            <iframe srcDoc={`<!DOCTYPE html>`} {...rest} ref={node => (this.node = node)} title={title} style={style} frameBorder="0">
                {this.iframeHead && createPortal(head, this.iframeHead)}
                {this.iframeRoot && createPortal(children, this.iframeRoot)}
            </iframe>
        );
    }
}
