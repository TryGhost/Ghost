import * as Sentry from '@sentry/ember';
import Component from '@glimmer/component';
import React, {Suspense} from 'react';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';

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

const editorResource = fetchKoenig();

const KoenigComposer = (props) => {
    const {KoenigComposer: _KoenigComposer} = editorResource.read();
    return <_KoenigComposer {...props} />;
};

const KoenigEditor = (props) => {
    const {KoenigEditor: _KoenigEditor} = editorResource.read();
    return <_KoenigEditor {...props} />;
};

export default class KoenigLexicalEditor extends Component {
    @inject config;

    @action
    onError(error) {
        // ensure we're still showing errors in development
        console.error(error); // eslint-disable-line

        if (this.config.sentry_dsn) {
            Sentry.captureException(error, {
                tags: {
                    lexical: true
                }
            });
        }

        // don't rethrow, Lexical will attempt to gracefully recover
    }

    ReactComponent = () => {
        const [uploadProgress, setUploadProgress] = React.useState(0);

        const uploadProgressHandler = (event) => {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(percentComplete);
            if (percentComplete === 100) {
                setUploadProgress(0);
            }
        };

        async function imageUploader(files) {
            function uploadToUrl(formData, url) {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', url);
                    xhr.upload.onprogress = (event) => {
                        uploadProgressHandler(event);
                    };
                    xhr.onload = () => resolve(xhr.response);
                    xhr.onerror = () => reject(xhr.statusText);
                    xhr.send(formData);
                });
            }
            const formData = new FormData();
            formData.append('file', files[0]);
            const url = `${ghostPaths().apiRoot}/images/upload/`;
            const response = await uploadToUrl(formData, url);
            const dataset = JSON.parse(response);
            const imageUrl = dataset?.images?.[0].url;
            return {
                src: imageUrl
            };
        }
        return (
            <div className={['koenig-react-editor', this.args.className].filter(Boolean).join(' ')}>
                <ErrorHandler>
                    <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                        <KoenigComposer
                            initialEditorState={this.args.lexical}
                            onError={this.onError}
                            imageUploadFunction={{imageUploader, uploadProgress}}
                        >
                            <KoenigEditor
                                onChange={this.args.onChange}
                                registerAPI={this.args.registerAPI}
                                cursorDidExitAtTop={this.args.cursorDidExitAtTop}
                            />
                        </KoenigComposer>
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
