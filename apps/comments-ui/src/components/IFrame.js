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

            // This is a bit hacky, but prevents us to need to attach even listeners to all the iframes we have
            // because when we want to listen for keydown events, those are only send in the window of iframe that is focused
            // To get around this, we pass down the keydown events to the main window
            // No need to detach, because the iframe would get removed
            this.node.contentWindow.addEventListener('keydown', (e) => {              
                // dispatch a new event
                window.dispatchEvent(
                    new KeyboardEvent('keydown', e)
                );
            });
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
