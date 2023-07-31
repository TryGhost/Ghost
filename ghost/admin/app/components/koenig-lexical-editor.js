import * as Sentry from '@sentry/ember';
import Component from '@glimmer/component';
import React, {Suspense} from 'react';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export const fileTypes = {
    image: {
        mimeTypes: ['image/gif', 'image/jpg', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        extensions: ['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp'],
        endpoint: '/images/upload/',
        resourceName: 'images'
    },
    video: {
        mimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
        extensions: ['mp4', 'webm', 'ogv'],
        endpoint: '/media/upload/',
        resourceName: 'media'
    },
    audio: {
        mimeTypes: ['audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/vnd.wav', 'audio/wave', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'],
        extensions: ['mp3', 'wav', 'ogg', 'm4a'],
        endpoint: '/media/upload/',
        resourceName: 'media'
    },
    mediaThumbnail: {
        mimeTypes: ['image/gif', 'image/jpg', 'image/jpeg', 'image/png', 'image/webp'],
        extensions: ['gif', 'jpg', 'jpeg', 'png', 'webp'],
        endpoint: '/media/thumbnail/upload/',
        requestMethod: 'put',
        resourceName: 'media'
    },
    file: {
        endpoint: '/files/upload/',
        resourceName: 'files'
    }
};

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

const WordCountPlugin = (props) => {
    const {WordCountPlugin: _WordCountPlugin} = editorResource.read();
    return <_WordCountPlugin {...props} />;
};

export default class KoenigLexicalEditor extends Component {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service session;
    @service store;
    @service settings;
    @service membersUtils;

    @inject config;
    offers = null;

    get pinturaJsUrl() {
        if (!this.settings.pintura) {
            return null;
        }
        return this.config.pintura?.js || this.settings.pinturaJsUrl;
    }

    get pinturaCSSUrl() {
        if (!this.settings.pintura) {
            return null;
        }
        return this.config.pintura?.css || this.settings.pinturaCssUrl;
    }

    get pinturaConfig() {
        const jsUrl = this.getImageEditorJSUrl();
        const cssUrl = this.getImageEditorCSSUrl();
        if (!this.feature.lexicalEditor || !jsUrl || !cssUrl) {
            return null;
        }
        return {
            jsUrl,
            cssUrl
        };
    }

    getImageEditorJSUrl() {
        let importUrl = this.pinturaJsUrl;

        if (!importUrl) {
            return null;
        }

        // load the script from admin root if relative
        if (importUrl.startsWith('/')) {
            importUrl = window.location.origin + this.ghostPaths.adminRoot.replace(/\/$/, '') + importUrl;
        }
        return importUrl;
    }

    getImageEditorCSSUrl() {
        let cssImportUrl = this.pinturaCSSUrl;

        if (!cssImportUrl) {
            return null;
        }

        // load the css from admin root if relative
        if (cssImportUrl.startsWith('/')) {
            cssImportUrl = window.location.origin + this.ghostPaths.adminRoot.replace(/\/$/, '') + cssImportUrl;
        }
        return cssImportUrl;
    }

    @action
    onError(error) {
        // ensure we're still showing errors in development
        console.error(error); // eslint-disable-line

        if (this.config.sentry_dsn) {
            Sentry.captureException(error, {
                tags: {lexical: true},
                contexts: {
                    koenig: {
                        version: window['@tryghost/koenig-lexical']?.version
                    }
                }
            });
        }
        // don't rethrow, Lexical will attempt to gracefully recover
    }

    @task({restartable: true})
    *fetchOffersTask() {
        if (this.offers) {
            return this.offers;
        }
        this.offers = yield this.store.query('offer', {limit: 'all', filter: 'status:active'});
        return this.offers;
    }

    @task({restartable: true})
    *fetchLabelsTask() {
        if (this.labels) {
            return this.labels;
        }

        this.labels = yield this.store.query('label', {limit: 'all', fields: 'id, name'});
        return this.labels;
    }

    ReactComponent = (props) => {
        const fetchEmbed = async (url, {type}) => {
            let oembedEndpoint = this.ghostPaths.url.api('oembed');
            let response = await this.ajax.request(oembedEndpoint, {
                data: {url, type}
            });
            return response;
        };

        const fetchCollectionPosts = async (collectionSlug) => {
            const collectionPostsEndpoint = this.ghostPaths.url.api('posts');
            const {posts} = await this.ajax.request(collectionPostsEndpoint, {
                data: {
                    collection: collectionSlug, 
                    limit: 12
                }
            });
            return posts;
        };

        const fetchAutocompleteLinks = async () => {
            const offers = await this.fetchOffersTask.perform();

            const defaults = [
                {label: 'Homepage', value: window.location.origin + '/'},
                {label: 'Free signup', value: window.location.origin + '/#/portal/signup/free'}
            ];

            const offersLinks = offers.toArray().map((offer) => {
                return {
                    label: `Offer - ${offer.name}`,
                    value: this.config.getSiteUrl(offer.code)
                };
            });

            const memberLinks = () => {
                let links = [];
                if (this.membersUtils.paidMembersEnabled) {
                    links = [
                        {
                            label: 'Paid signup',
                            value: this.config.getSiteUrl('/#/portal/signup')
                        },
                        {
                            label: 'Upgrade or change plan',
                            value: this.config.getSiteUrl('/#/portal/account/plans')
                        }];
                }

                return links;
            };
            return [...defaults, ...offersLinks, ...memberLinks()];
        };

        const fetchLabels = async () => {
            const labels = await this.fetchLabelsTask.perform();

            return labels.map(label => label.name);
        };

        const defaultCardConfig = {
            unsplash: {
                defaultHeaders: {
                    Authorization: `Client-ID 8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980`,
                    'Accept-Version': 'v1',
                    'Content-Type': 'application/json',
                    'App-Pragma': 'no-cache',
                    'X-Unsplash-Cache': true
                }
            },
            tenor: this.config.tenor?.googleApiKey ? this.config.tenor : null,
            fetchEmbed,
            fetchCollectionPosts,
            fetchAutocompleteLinks,
            fetchLabels,
            feature: {
                signupCard: true,
                collectionsCard: this.feature.get('collectionsCard'),
                collections: this.feature.get('collections'),
                headerV2: this.feature.get('headerUpgrade')
            },
            membersEnabled: this.settings.get('membersSignupAccess') === 'all',
            siteTitle: this.settings.title,
            siteDescription: this.settings.description
        };
        const cardConfig = Object.assign({}, defaultCardConfig, props.cardConfig, {pinturaConfig: this.pinturaConfig});

        const useFileUpload = (type = 'image') => {
            const [progress, setProgress] = React.useState(0);
            const [isLoading, setLoading] = React.useState(false);
            const [errors, setErrors] = React.useState([]);
            const [filesNumber, setFilesNumber] = React.useState(0);

            const progressTracker = React.useRef(new Map());

            function updateProgress() {
                if (progressTracker.current.size === 0) {
                    setProgress(0);
                    return;
                }

                let totalProgress = 0;

                progressTracker.current.forEach(value => totalProgress += value);

                setProgress(Math.round(totalProgress / progressTracker.current.size));
            }

            // we only check the file extension by default because IE doesn't always
            // expose the mime-type, we'll rely on the API for final validation
            function defaultValidator(file) {
                // if type is file we don't need to validate since the card can accept any file type
                if (type === 'file') {
                    return true;
                }
                let extensions = fileTypes[type].extensions;
                let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);

                // if extensions is falsy exit early and accept all files
                if (!extensions) {
                    return true;
                }

                if (!Array.isArray(extensions)) {
                    extensions = extensions.split(',');
                }

                if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
                    let validExtensions = `.${extensions.join(', .').toUpperCase()}`;
                    return `The file type you uploaded is not supported. Please use ${validExtensions}`;
                }

                return true;
            }

            const validate = (files = []) => {
                const validationResult = [];

                for (let i = 0; i < files.length; i += 1) {
                    let file = files[i];
                    let result = defaultValidator(file);
                    if (result === true) {
                        continue;
                    }

                    validationResult.push({fileName: file.name, message: result});
                }

                return validationResult;
            };

            const _uploadFile = async (file, {formData = {}} = {}) => {
                progressTracker.current[file] = 0;

                const fileFormData = new FormData();
                fileFormData.append('file', file, file.name);

                Object.keys(formData || {}).forEach((key) => {
                    fileFormData.append(key, formData[key]);
                });

                const url = `${ghostPaths().apiRoot}${fileTypes[type].endpoint}`;

                try {
                    const requestMethod = fileTypes[type].requestMethod || 'post';
                    const response = await this.ajax[requestMethod](url, {
                        data: fileFormData,
                        processData: false,
                        contentType: false,
                        dataType: 'text',
                        xhr: () => {
                            const xhr = new window.XMLHttpRequest();

                            xhr.upload.addEventListener('progress', (event) => {
                                if (event.lengthComputable) {
                                    progressTracker.current.set(file, (event.loaded / event.total) * 100);
                                    updateProgress();
                                }
                            }, false);

                            return xhr;
                        }
                    });

                    // force tracker progress to 100% in case we didn't get a final event
                    progressTracker.current.set(file, 100);
                    updateProgress();

                    let uploadResponse;
                    let responseUrl;

                    try {
                        uploadResponse = JSON.parse(response);
                    } catch (error) {
                        if (!(error instanceof SyntaxError)) {
                            throw error;
                        }
                    }

                    if (uploadResponse) {
                        const resource = uploadResponse[fileTypes[type].resourceName];
                        if (resource && Array.isArray(resource) && resource[0]) {
                            responseUrl = resource[0].url;
                        }
                    }

                    return {
                        url: responseUrl,
                        fileName: file.name
                    };
                } catch (error) {
                    console.error(error); // eslint-disable-line

                    // grab custom error message if present
                    let message = error.payload?.errors?.[0]?.message || '';
                    let context = error.payload?.errors?.[0]?.context || '';

                    // fall back to EmberData/ember-ajax default message for error type
                    if (!message) {
                        message = error.message;
                    }

                    // TODO: check for or expose known error types?
                    const errorResult = {
                        message,
                        context,
                        fileName: file.name
                    };

                    throw errorResult;
                }
            };

            const upload = async (files = [], options = {}) => {
                setFilesNumber(files.length);
                setLoading(true);

                const validationResult = validate(files);

                if (validationResult.length) {
                    setErrors(validationResult);
                    setLoading(false);
                    setProgress(100);

                    return null;
                }

                const uploadPromises = [];

                for (let i = 0; i < files.length; i += 1) {
                    const file = files[i];
                    uploadPromises.push(_uploadFile(file, options));
                }

                try {
                    const uploadResult = await Promise.all(uploadPromises);
                    setProgress(100);
                    progressTracker.current.clear();

                    setLoading(false);

                    setErrors([]); // components expect array of objects: { fileName: string, message: string }[]

                    return uploadResult;
                } catch (error) {
                    console.error(error); // eslint-disable-line no-console

                    setErrors([...errors, error]);
                    setLoading(false);
                    setProgress(100);
                    progressTracker.current.clear();

                    return null;
                }
            };

            return {progress, isLoading, upload, errors, filesNumber};
        };

        // TODO: react component isn't re-rendered when its props are changed meaning we don't transition
        // to enabling multiplayer when a new post is saved and it gets an ID we can use for a YJS doc
        // - figure out how to re-render the component when its props change
        // - figure out some other mechanism for handling posts that don't really exist yet with multiplayer
        const enableMultiplayer = this.feature.lexicalMultiplayer && !cardConfig.post.isNew;
        const multiplayerWsProtocol = window.location.protocol === 'https:' ? `wss:` : `ws:`;
        const multiplayerEndpoint = multiplayerWsProtocol + window.location.host + this.ghostPaths.url.api('posts', 'multiplayer');
        const multiplayerDocId = cardConfig.post.id;
        const multiplayerUsername = this.session.user.name;

        return (
            <div className={['koenig-react-editor', 'koenig-lexical', this.args.className].filter(Boolean).join(' ')}>
                <ErrorHandler>
                    <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                        <KoenigComposer
                            cardConfig={cardConfig}
                            enableMultiplayer={enableMultiplayer}
                            fileUploader={{useFileUpload, fileTypes}}
                            initialEditorState={this.args.lexical}
                            multiplayerUsername={multiplayerUsername}
                            multiplayerDocId={multiplayerDocId}
                            multiplayerEndpoint={multiplayerEndpoint}
                            onError={this.onError}
                            darkMode={this.feature.nightShift}
                        >
                            <KoenigEditor
                                cursorDidExitAtTop={this.args.cursorDidExitAtTop}
                                darkMode={this.feature.nightShift}
                                onChange={this.args.onChange}
                                registerAPI={this.args.registerAPI}
                            />
                            <WordCountPlugin onChange={this.args.updateWordCount} />
                        </KoenigComposer>
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
