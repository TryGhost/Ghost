import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const handleDataAttributes = require('./data-attributes');
const ROOT_DIV_ID = 'ghost-membersjs-root';

function addRootDiv() {
    const elem = document.createElement('div');
    elem.id = ROOT_DIV_ID;
    document.body.appendChild(elem);
}

function loadStripe() {
    // We don't want to load Stripe again if already loaded
    if (!window.Stripe) {
        // Get the first script element on the page
        const ref = document.getElementsByTagName('script')[0];
        // Create a new script element
        const script = document.createElement('script');
        // Set the script element `src`
        script.src = 'https://js.stripe.com/v3/';
        // Inject the script into the DOM
        ref.parentNode.insertBefore(script, ref);
    }
}

function handleTokenUrl() {
    const url = new URL(window.location);
    if (url.searchParams.get('token')) {
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.href);
    }
}

function setup() {
    loadStripe();
    addRootDiv();
    handleDataAttributes({siteUrl: window.location.origin});
    handleTokenUrl();
}

function init() {
    setup();
    ReactDOM.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
