import React from 'react';
import './App.css';
import AppContext from './AppContext';
import PopupModal from './components/PopupModal';

function App() {
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

export default App;
