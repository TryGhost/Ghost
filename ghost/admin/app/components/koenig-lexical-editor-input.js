import * as Sentry from '@sentry/ember';
import Component from '@glimmer/component';
import React, {Suspense} from 'react';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

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
    const {KoenigComposer: _KoenigComposer, MINIMAL_NODES: _MINIMAL_NODES} = editorResource.read();
    return <_KoenigComposer nodes={_MINIMAL_NODES} {...props} />;
};

const KoenigComposableEditor = (props) => {
    const {KoenigComposableEditor: _KoenigComposableEditor, MINIMAL_TRANSFORMERS: _MINIMAL_TRANSFORMERS} = editorResource.read();
    return <_KoenigComposableEditor markdownTransformers={_MINIMAL_TRANSFORMERS} {...props} />;
};

const HtmlOutputPlugin = (props) => {
    const {HtmlOutputPlugin: _HtmlOutputPlugin} = editorResource.read();
    return <_HtmlOutputPlugin {...props} />;
};

export default class KoenigLexicalEditorInput extends Component {
    @service ajax;
    @service feature;
    @service session;

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

    ReactComponent = (props) => {
        return (
            <div className={['koenig-react-editor', this.args.className].filter(Boolean).join(' ')}>
                <ErrorHandler>
                    <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                        <KoenigComposer
                            initialEditorState={this.args.lexical}
                            onError={this.onError}
                        >
                            <KoenigComposableEditor
                                darkMode={this.feature.nightShift}
                                onChange={props.onChange}
                                onBlur={props.onBlur}
                                isSnippetsEnabled={false}
                                singleParagraph={true}
                                className="koenig-lexical-editor-input"
                                placeholderText={props.placeholderText}
                                placeholderClassName="koenig-lexical-editor-input-placeholder"
                            >
                                <HtmlOutputPlugin html={props.html} setHtml={props.onChangeHtml} />
                            </KoenigComposableEditor>
                        </KoenigComposer>
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
