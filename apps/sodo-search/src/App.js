import React from 'react';
import './App.css';
import AppContext from './AppContext';
import PopupModal from './components/PopupModal';
import SearchIndex from './search-index.js';
import i18nLib from '@tryghost/i18n';

export default class App extends React.Component {
    constructor(props) {
        super(props);

        const searchIndex = new SearchIndex({
            adminUrl: props.adminUrl,
            apiKey: props.apiKey
        });

        const i18nLanguage = this.props.locale || 'en';
        const i18n = i18nLib(i18nLanguage, 'search');

        this.state = {
            searchIndex,
            showPopup: false,
            indexStarted: false,
            indexComplete: false,
            t: i18n.t
        };

        this.inputRef = React.createRef();
    }

    componentDidMount() {
        this.initSetup();
    }

    componentDidUpdate(_prevProps, prevState) {
        if (prevState.showPopup !== this.state.showPopup) {
            /** Remove background scroll when popup is opened */
            try {
                if (this.state.showPopup) {
                    /** When modal is opened, store current overflow and set as hidden */
                    this.bodyScroll = window.document?.body?.style?.overflow;
                    window.document.body.style.overflow = 'hidden';
                } else {
                    /** When the modal is hidden, reset overflow property for body */
                    window.document.body.style.overflow = this.bodyScroll || '';
                }
            } catch (e) {
                /** Ignore any errors for scroll handling */
            }
        }

        if (this.state.showPopup !== prevState?.showPopup && !this.state.showPopup) {
            this.setState({
                searchValue: ''
            });
        }

        if (this.state.showPopup && !this.state.indexStarted) {
            this.setupSearchIndex();
        }
    }

    async setupSearchIndex() {
        this.setState({
            indexStarted: true
        });
        await this.state.searchIndex.init();
        this.setState({
            indexComplete: true
        });
    }

    componentWillUnmount() {
        /**Clear timeouts and event listeners on unmount */
        window.removeEventListener('hashchange', this.hashHandler, false);
        window.removeEventListener('keydown', this.handleKeyDown, false);
    }

    initSetup() {
        // Listen to preview mode changes
        this.handleSearchUrl();
        this.addKeyboardShortcuts();
        this.setupCustomTriggerButton();
        this.hashHandler = () => {
            this.handleSearchUrl();
        };
        window.addEventListener('hashchange', this.hashHandler, false);
    }

    /** Setup custom trigger buttons handling on page */
    setupCustomTriggerButton() {
        // Handler for custom buttons
        this.clickHandler = (event) => {
            event.preventDefault();
            this.setState({
                showPopup: true
            });

            const tmpElement = document.createElement('input');
            tmpElement.style.opacity = '0';
            tmpElement.style.position = 'fixed';
            tmpElement.style.top = '0';
            document.body.appendChild(tmpElement);
            tmpElement.focus();

            setTimeout(() => {
                this.inputRef.current.focus();
                document.body.removeChild(tmpElement);
            }, 150);
        };

        this.customTriggerButtons = this.getCustomTriggerButtons();
        this.customTriggerButtons.forEach((customTriggerButton) => {
            customTriggerButton.removeEventListener('click', this.clickHandler);
            customTriggerButton.addEventListener('click', this.clickHandler);
        });
    }

    getCustomTriggerButtons() {
        const customTriggerSelector = '[data-ghost-search]';
        return document.querySelectorAll(customTriggerSelector) || [];
    }

    handleSearchUrl() {
        const [path] = window.location.hash.substr(1).split('?');
        if (path === '/search' || path === '/search/') {
            this.setState({
                showPopup: true
            });
            window.history.replaceState('', document.title, window.location.pathname);
        }
    }

    addKeyboardShortcuts() {
        const customTriggerButtons = this.getCustomTriggerButtons();
        if (!customTriggerButtons?.length) {
            return;
        }
        this.handleKeyDown = (e) => {
            if (e.key === 'k' && e.metaKey) {
                this.setState({
                    showPopup: true
                });
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }

    render() {
        return (
            <AppContext.Provider value={{
                page: 'search',
                showPopup: this.state.showPopup,
                adminUrl: this.props.adminUrl,
                stylesUrl: this.props.stylesUrl,
                searchIndex: this.state.searchIndex,
                indexComplete: this.state.indexComplete,
                searchValue: this.state.searchValue,
                inputRef: this.inputRef,
                onAction: () => {},
                dispatch: (action, data) => {
                    if (action === 'update') {
                        this.setState({
                            ...this.state,
                            ...data
                        });
                    }
                },
                t: this.state.t
            }}>
                <PopupModal />
            </AppContext.Provider>
        );
    }
}
