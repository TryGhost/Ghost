import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

function addRootDiv() {
    const elem = document.createElement('div');
    elem.id = 'ghost-membersjs-root';
    document.body.appendChild(elem);
}

function handleTokenUrl() {
    const url = new URL(window.location);
    if (url.searchParams.get('token')) {
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.href);
    }
}

function init(data) {
    addRootDiv();
    handleTokenUrl();
    ReactDOM.render(
        <React.StrictMode>
            <App data={data} />
        </React.StrictMode>,
        document.getElementById('ghost-membersjs-root')
    );
}

window.GhostMembers = {
    init: init
};

// This will automatically load for local if an .env.development.local file is present
if (process.env.REACT_APP_ADMIN_URL) {
    const adminUrl = process.env.REACT_APP_ADMIN_URL;
    init({adminUrl});
}
