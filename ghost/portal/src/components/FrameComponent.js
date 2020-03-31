import React, { Component } from 'react'
import { createPortal } from 'react-dom'

export default class Frame extends Component {
  constructor(props) {
    super(props)

    this.setContentRef = (node) => {
        this.contentRef = ((!node || !node.contentWindow) && null) || (node && node.contentWindow.document.body);
        if (this.contentRef) {
            this.setState({
                refUpdated: this.state.refUpdated + 1
            })
        }
    }

    this.state = {
        refUpdated: 0
    }
  }


  renderFrameChildren() {
    const { children } = this.props // eslint-disable-line
      if (this.contentRef) {
          return createPortal(
            React.Children.only(children),
            this.contentRef
          );
      }
      return null;
  }

  render() {
    const { children, title = "membersjs-frame", ...props } = this.props // eslint-disable-line
    const style = this.props.style || {};
    return (
      <iframe title= {title} ref={this.setContentRef} style={style} frameBorder="0">
          {this.renderFrameChildren()}
      </iframe>
    )
  }
}