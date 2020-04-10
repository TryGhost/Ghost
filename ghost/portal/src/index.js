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

// Uncomment for local UI testing
// initMembersJS({site: {siteUrl: "", adminUrl: ""}});

window.GhostMembers = {
    initMembersJS: initMembersJS
};
