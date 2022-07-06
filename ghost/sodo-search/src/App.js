import React from 'react';
import './App.css';
import AppContext from './AppContext';
import PopupModal from './components/PopupModal';
import SearchIndex from './search-index.js';

export default class App extends React.Component {
    constructor(props) {
        super(props);

        const searchIndex = new SearchIndex({
            apiUrl: props.apiUrl,
            apiKey: props.apiKey
        });

        this.state = {
            searchIndex,
            showPopup: false
        };
    }

    async componentDidMount() {
        this.initSetup();
        await this.state.searchIndex.init();
        this.setState({
            indexComplete: true
        });
    }

    componentDidUpdate(_prevProps, _prevState) {
        if (this.state.showPopup !== _prevState?.showPopup && !this.state.showPopup) {
            this.setState({
                searchValue: ''
            });
        }
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
        this.hashHandler = () => {
            this.handleSearchUrl();
        };
        window.addEventListener('hashchange', this.hashHandler, false);
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
        this.handleKeyDown = (e) => {
            if (e.keyCode === 75 && e.metaKey) {
                this.setState({
                    showPopup: true
                });
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }

    render() {
        return (
            <AppContext.Provider value={{
                page: 'search',
                showPopup: this.state.showPopup,
                siteUrl: this.props.siteUrl,
                appVersion: this.props.appVersion,
                searchIndex: this.state.searchIndex,
                indexComplete: this.state.indexComplete,
                searchValue: this.state.searchValue,
                onAction: () => {},
                dispatch: (action, data) => {
                    if (action === 'update') {
                        this.setState({
                            ...this.state,
                            ...data
                        });
                    }
                }
            }}>
                <PopupModal />
            </AppContext.Provider>
        );
    }
}
