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
            showPopup: true
        };
    }

    async componentDidMount() {
        await this.state.searchIndex.init();
        this.setState({
            indexComplete: true
        });
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
