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

const KoenigComposer = ({editorResource, ...props}) => {
    const {KoenigComposer: _KoenigComposer, MINIMAL_NODES: _MINIMAL_NODES} = editorResource.read();
    return <_KoenigComposer nodes={_MINIMAL_NODES} {...props} />;
};

const KoenigComposableEditor = ({editorResource, ...props}) => {
    const {KoenigComposableEditor: _KoenigComposableEditor, MINIMAL_TRANSFORMERS: _MINIMAL_TRANSFORMERS} = editorResource.read();
    return <_KoenigComposableEditor markdownTransformers={_MINIMAL_TRANSFORMERS} {...props} />;
};

const HtmlOutputPlugin = ({editorResource, ...props}) => {
    const {HtmlOutputPlugin: _HtmlOutputPlugin} = editorResource.read();
    return <_HtmlOutputPlugin {...props} />;
};

export default class KoenigLexicalEditorInput extends Component {
    @service ajax;
    @service feature;
    @service koenig;
    @service session;

    @inject config;

    editorResource = this.koenig.resource;

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
                            editorResource={this.editorResource}
                            initialEditorState={this.args.lexical}
                            onError={this.onError}
                        >
                            <KoenigComposableEditor
                                editorResource={this.editorResource}
                                darkMode={this.feature.nightShift}
                                onChange={props.onChange}
                                onBlur={props.onBlur}
                                onFocus={props.onFocus}
                                isSnippetsEnabled={false}
                                singleParagraph={true}
                                className={`koenig-lexical-editor-input ${this.feature.nightShift ? 'dark' : ''}`}
                                placeholderText={props.placeholderText}
                                placeholderClassName="koenig-lexical-editor-input-placeholder"
                            >
                                <HtmlOutputPlugin editorResource={this.editorResource} html={props.html} setHtml={props.onChangeHtml} />
                            </KoenigComposableEditor>
                        </KoenigComposer>
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
