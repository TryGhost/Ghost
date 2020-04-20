import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

function addRootDiv() {
    const elem = document.createElement('div');
    elem.id = 'ghost-membersjs-root';
    document.body.appendChild(elem);
}

function initMembersJS(data) {
    addRootDiv();
    ReactDOM.render(
        <React.StrictMode>
            <App data={data} />
        </React.StrictMode>,
        document.getElementById('ghost-membersjs-root')
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
