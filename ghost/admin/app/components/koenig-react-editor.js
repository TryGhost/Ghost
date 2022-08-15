import Component from '@glimmer/component';
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
                <p className="koenig-react-editor-error">Loading has failed. Try refreshing the browser!</p>
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

        // the manual specification of the protocol in the import template string is
        // required to work around ember-auto-import complaining about an unknown dynamic import
        // during the build step
        const GhostAdmin = window.Ember.Namespace.NAMESPACES.find(ns => ns.name === 'ghost-admin');
        const url = new URL(GhostAdmin.__container__.lookup('service:config').get('editor.url'));

        if (url.protocol === 'http:') {
            await import(`http://${url.host}${url.pathname}`);
        } else {
            await import(`https://${url.host}${url.pathname}`);
        }

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
    const _Koenig = editorResource.read();
    return <_Koenig {...props} />;
};

export default class KoenigReactEditor extends Component {
    ReactComponent = () => {
        return (
            <div className={['koenig-react-editor', this.args.className].filter(Boolean).join(' ')}>
                <ErrorHandler>
                    <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                        <Koenig
                            mobiledoc={this.args.mobiledoc}
                            didCreateEditor={this.args.didCreateEditor}
                            onChange={this.args.onChange}
                            uploadUrl={this.args.uploadUrl}
                            accentColor={this.args.accentColor}
                        />
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
