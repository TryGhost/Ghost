import * as Sentry from '@sentry/ember';
import Component from '@glimmer/component';
import React, {Suspense} from 'react';
import {action} from '@ember/object';
import {decoratePostSearchResult} from 'ghost-admin/components/koenig-lexical-editor';
import {didCancel} from 'ember-concurrency';
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
    @service search;
    @service settings;
    @service store;

    @inject config;

    defaultLinks = null;
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
        const searchLinks = async (term) => {
            // when no term is present we should show latest 5 posts
            if (!term) {
                // we cache the default links to avoid fetching them every time
                if (this.defaultLinks) {
                    return this.defaultLinks;
                }

                const posts = await this.store.query('post', {filter: 'status:published', fields: 'id,url,title,visibility,published_at', order: 'published_at desc', limit: 5});
                // NOTE: these posts are Ember Data models, not plain objects like the search results
                const results = posts.toArray().map(post => ({
                    groupName: 'Latest posts',
                    id: post.id,
                    title: post.title,
                    url: post.url,
                    visibility: post.visibility,
                    publishedAt: post.publishedAtUTC.toISOString()
                }));

                results.forEach(item => decoratePostSearchResult(item, this.settings));

                this.defaultLinks = [{
                    label: 'Latest posts',
                    items: results
                }];
                return this.defaultLinks;
            }

            let results = [];

            try {
                results = await this.search.searchTask.perform(term);
            } catch (error) {
                // don't surface task cancellation errors
                if (!didCancel(error)) {
                    throw error;
                }
                return [];
            }

            // only published posts/pages and staff with posts have URLs
            const filteredResults = [];
            results.forEach((group) => {
                let items = group.options;

                if (group.groupName === 'Posts' || group.groupName === 'Pages') {
                    items = items.filter(i => i.status === 'published');
                }

                if (group.groupName === 'Staff') {
                    items = items.filter(i => !/\/404\//.test(i.url));
                }

                if (items.length === 0) {
                    return;
                }

                // update the group items with metadata
                if (group.groupName === 'Posts' || group.groupName === 'Pages') {
                    items.forEach(item => decoratePostSearchResult(item, this.settings));
                }

                filteredResults.push({
                    label: group.groupName,
                    items
                });
            });

            return filteredResults;
        };

        const cardConfig = {
            searchLinks
        };

        return (
            <div className={['koenig-react-editor', this.args.className].filter(Boolean).join(' ')}>
                <ErrorHandler config={this.config}>
                    <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                        <KoenigComposer
                            editorResource={this.editorResource}
                            initialEditorState={this.args.lexical}
                            onError={this.onError}
                            isTKEnabled={this.args.onTKCountChange ? true : false}
                            cardConfig={cardConfig}
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
