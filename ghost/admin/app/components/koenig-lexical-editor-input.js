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

    componentDidCatch(error) {
        if (this.props.config.sentry_dsn) {
            Sentry.captureException(error, {
                tags: {
                    lexical: true
                }
            });
        }

        console.error(error); // eslint-disable-line
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

const EmojiPickerPlugin = ({editorResource, ...props}) => {
    const {EmojiPickerPlugin: _EmojiPickerPlugin} = editorResource.read();
    return <_EmojiPickerPlugin {...props} />;
};

const TKCountPlugin = ({editorResource, ...props}) => {
    const {TKCountPlugin: _TKCountPlugin} = editorResource.read();
    return <_TKCountPlugin {...props} />;
};

export default class KoenigLexicalEditorInput extends Component {
    @service ajax;
    @service feature;
    @service koenig;
    @service session;

    @inject config;

    editorResource = this.koenig.resource;

    get emojiPicker() {
        return this.args.emojiPicker ?? true;
    }

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
                <ErrorHandler config={this.config}>
                    <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                        <KoenigComposer
                            editorResource={this.editorResource}
                            initialEditorState={this.args.lexical}
                            onError={this.onError}
                            isTKEnabled={this.args.onTKCountChange ? true : false}
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
                                registerAPI={this.args.registerAPI}
                            >
                                <HtmlOutputPlugin editorResource={this.editorResource} html={props.html} setHtml={props.onChangeHtml} />
                                {this.emojiPicker ? <EmojiPickerPlugin editorResource={this.editorResource} /> : null}
                                {this.args.onTKCountChange ? <TKCountPlugin editorResource={this.editorResource} onChange={this.args.onTKCountChange} /> : null}
                            </KoenigComposableEditor>
                        </KoenigComposer>
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
