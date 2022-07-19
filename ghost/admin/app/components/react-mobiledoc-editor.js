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

        await import('https://unpkg.com/kevinansfield-react-mobiledoc-editor@~0.13.2/dist/main.js');
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
