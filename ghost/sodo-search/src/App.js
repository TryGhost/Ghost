import React from 'react';
import './App.css';
import AppContext from './AppContext';
import PopupModal from './components/PopupModal';

export default class App extends React.Component {
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
