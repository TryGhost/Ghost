import React from 'react';
import './App.css';
import AppContext from './AppContext';
import PopupModal from './components/PopupModal';
import {init as initSearchIndex} from './search-index.js';

export default class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            apiUrl: props.apiUrl,
            apiKey: props.apiKey
        };
    }

    componentDidMount() {
        initSearchIndex({
            apiUrl: this.state.apiUrl,
            apiKey: this.state.apiKey
        });
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
