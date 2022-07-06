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

    componentWillUnmount() {
        /**Clear timeouts and event listeners on unmount */
        window.removeEventListener('hashchange', this.hashHandler, false);
    }

    initSetup() {
        // Listen to preview mode changes
        this.handleSearchUrl();
        this.hashHandler = () => {
            this.handleSearchUrl();
        };
        window.addEventListener('hashchange', this.hashHandler, false);
    }

    handleSearchUrl() {
        const [path] = window.location.hash.substr(1).split('?');
        if (path === '/sodo-search') {
            this.setState({
                showPopup: true
            });
            window.history.replaceState('', document.title, window.location.pathname);
        }
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
