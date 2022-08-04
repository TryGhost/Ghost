import * as React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

/* styles that are useful for the demo app but shouldn't be applied to the re-usable component */
const rootStyles = {
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: '6.4rem',
    paddingBottom: '6.4rem',
    width: '100%',
    maxWidth: '67.2rem'
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <div style={rootStyles}>
        <App />
    </div>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
