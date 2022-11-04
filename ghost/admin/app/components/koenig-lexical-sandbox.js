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
        if (window['@tryghost/koenig-lexical']) {
            return window['@tryghost/koenig-lexical'];
        }

        // the manual specification of the protocol in the import template string is
        // required to work around ember-auto-import complaining about an unknown dynamic import
        // during the build step
        const GhostAdmin = window.GhostAdmin || window.Ember.Namespace.NAMESPACES.find(ns => ns.name === 'ghost-admin');
        const urlTemplate = GhostAdmin.__container__.lookup('config:main').editor?.url;
        const urlVersion = GhostAdmin.__container__.lookup('config:main').editor?.version;

        const url = new URL(urlTemplate.replace('{version}', urlVersion));

        if (url.protocol === 'http:') {
            await import(`http://${url.host}${url.pathname}`);
        } else {
            await import(`https://${url.host}${url.pathname}`);
        }

        return window['@tryghost/koenig-lexical'];
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

const koenigResource = fetchKoenig();

const KoenigSandbox = (props) => {
    const {DesignSandbox: _DesignSandbox} = koenigResource.read();
    return <_DesignSandbox {...props} />;
};

export default class LexicalSandbox extends Component {
    ReactComponent = () => {
        return (
            <div className={[this.args.className].filter(Boolean).join(' ')}>
                <ErrorHandler>
                    <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                        <KoenigSandbox />
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
