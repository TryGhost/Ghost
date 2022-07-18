import React from 'react';
import {Container, Editor} from 'react-mobiledoc-editor';

export default class ReactMobiledocEditor extends React.Component {
    render() {
        return (<Container
            mobiledoc={this.props.mobiledoc}
        >
            <Editor />
        </Container>);
    }
}
