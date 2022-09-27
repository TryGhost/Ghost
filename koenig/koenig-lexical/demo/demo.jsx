import React from 'react';
import ReactDOM from 'react-dom/client';
import {
    BrowserRouter as Router,
    Routes,
    Route
} from 'react-router-dom';
import {DesignSandbox} from '../src';
import DemoApp from './DemoApp';
import './styles/demo.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Router>
            <Routes>
                <Route path="/designsandbox" element={<DesignSandbox />} />
                <Route path="/" element={<DemoApp />} />
            </Routes>
        </Router>
    </React.StrictMode>
);
