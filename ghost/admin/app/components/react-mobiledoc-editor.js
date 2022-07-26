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

const fetchKoenig = function () {
    let status = 'pending';
    let response;

    const fetchPackage = async () => {
        if (window.koenigEditor) {
            return window.koenigEditor.default;
        }

        // the removal of `https://` and it's manual addition to the import template string is
        // required to work around ember-auto-import complaining about an unknown dynamic import
        // during the build step
        const url = GhostAdmin.__container__.lookup('service:config').get('editor.url').replace('https://', '');
        await import(`https://${url}`);

        return window.koenigEditor.default;
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

const editorResource = fetchKoenig();

const Koenig = (props) => {
    const KoenigEditor = editorResource.read();
    return <KoenigEditor {...props} />;
};

export default function ReactMobiledocEditorComponent(props) {
    return (
        <ErrorHandler>
            <Suspense fallback={<p>Loading editor...</p>}>
                <Koenig
                    mobiledoc={props.mobiledoc}
                    onChange={props.onChange}
                />
            </Suspense>
        </ErrorHandler>
    );
}
