/* global GhostAdmin */
import React, {Suspense} from 'react';

class ErrorHandler extends React.Component {
    state = {
        hasError: false
    };

    static getDerivedStateFromError() {
        return {hasError: true};
    }

    render() {
        if (this.state.hasError) {
            return (
                <p>Loading has failed. Try refreshing the browser!</p>
            );
        }

        return this.props.children;
    }
}

const fetchMobiledocEditor = function () {
    let status = 'pending';
    let response;

    const fetchPackage = async () => {
        if (window.ReactMobiledocEditor) {
            return window.ReactMobiledocEditor;
        }

        // the removal of `https://` and it's manual addition to the import template string is
        // required to work around ember-auto-import complaining about an unknown dynamic import
        // during the build step
        const url = GhostAdmin.__container__.lookup('service:config').get('editor.url').replace('https://', '');
        await import(`https://${url}`);

        return window.ReactMobiledocEditor;
    };

    const suspender = fetchPackage().then(
        (res) => {
            status = 'success';
            response = res;
        },
        (err) => {
            status = 'error';
            response = err;
        }
    );

    const read = () => {
        switch (status) {
        case 'pending':
            throw suspender;
        case 'error':
            throw response;
        default:
            return response;
        }
    };

    return {read};
};

const editorResource = fetchMobiledocEditor();

const Container = (props) => {
    const MobiledocEditor = editorResource.read();
    return <MobiledocEditor.Container {...props} />;
};

const Editor = (props) => {
    const MobiledocEditor = editorResource.read();
    return <MobiledocEditor.Editor {...props} />;
};

export default function ReactMobiledocEditorComponent(props) {
    return (
        <ErrorHandler>
            <Suspense fallback={<p>Loading editor...</p>}>
                <Container
                    mobiledoc={props.mobiledoc}
                >
                    <Editor />
                </Container>
            </Suspense>
        </ErrorHandler>
    );
}
