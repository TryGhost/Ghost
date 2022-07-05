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
            searchIndex
        };
    }

    componentDidMount() {
        this.state.searchIndex.init();
    }

    render() {
        return (
            <AppContext.Provider value={{
                page: 'search',
                showPopup: true,
                onAction: () => {}
            }}>
                <PopupModal />
            </AppContext.Provider>
        );
    }
}
