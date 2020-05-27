import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const handleDataAttributes = require('./data-attributes');

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

function init() {
    addRootDiv();
    handleDataAttributes({siteUrl: window.location.origin});
    handleTokenUrl();
    ReactDOM.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
        document.getElementById('ghost-membersjs-root')
    );
}

init();
