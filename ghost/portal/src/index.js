import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

function initMembersJS(data) {
    ReactDOM.render(
        <React.StrictMode>
            <App data={data} />
        </React.StrictMode>,
        document.getElementById('root')
    );
}

window.GhostMembers = {
    initMembersJS: initMembersJS
};

// This will automatically load for local if an .env.development.local file is present
if (process.env.REACT_APP_ADMIN_URL) {
    const adminUrl = process.env.REACT_APP_ADMIN_URL;
    initMembersJS({adminUrl});
}
