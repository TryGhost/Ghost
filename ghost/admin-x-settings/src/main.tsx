import './styles/demo.css';
import App from './App.tsx';
import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App
            ghostVersion='5.x'
        />
    </React.StrictMode>
);
