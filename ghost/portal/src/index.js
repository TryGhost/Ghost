import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

function initMembersJS(data) {
  ReactDOM.render(
    <React.StrictMode>
      <App data={data} />
    </React.StrictMode>,
    document.getElementById('root')
  );
}

initMembersJS();

window.GhostMembers = {
  initMembersJS: initMembersJS
}


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
