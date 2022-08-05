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

const Demo = ({children, ...props}) => {
    return (
        <>
            <style>
                {`
                    html {
                        font-size: 62.5%;
                        line-height: 1.65;
                        letter-spacing: 0.01em;
                    }
                `}
            </style>
            <div {...props}>{children}</div>
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Demo style={rootStyles}>
        <App />
    </Demo>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
