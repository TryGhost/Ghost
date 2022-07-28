import React, {Component} from 'react';
import {createPortal} from 'react-dom';

export default class IFrame extends Component {
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
        if (this.node.contentDocument) {
            this.iframeHtml = this.node.contentDocument.documentElement;
            this.iframeHead = this.node.contentDocument.head;
            this.iframeRoot = this.node.contentDocument.body;
            this.forceUpdate();

            if (this.props.onResize) {
                (new ResizeObserver(_ => this.props.onResize(this.iframeRoot)))?.observe?.(this.iframeRoot);
            }
        }
    }

    render() {
        const {children, head, title = '', style = {}, onResize, ...rest} = this.props;
        return (
            <iframe srcDoc={`<!DOCTYPE html>`} {...rest} ref={node => (this.node = node)} title={title} style={style} frameBorder="0">
                {this.iframeHead && createPortal(head, this.iframeHead)}
                {this.iframeRoot && createPortal(children, this.iframeRoot)}
            </iframe>
        );
    }
}
