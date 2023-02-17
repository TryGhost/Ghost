import React from 'react';
import ReactDOM from 'react-dom/client';
import {
    BrowserRouter as Router,
    Routes,
    Route
} from 'react-router-dom';
import {DesignSandbox} from '../src';
import DemoApp from './DemoApp';
import RestrictedContentDemo from './RestrictedContentDemo';
import './styles/demo.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Router>
            <Routes>
                <Route path="/designsandbox" element={<DesignSandbox />} />
                <Route path="/contentrestricted" element={<RestrictedContentDemo paragraphs={1} />} />
                <Route path="/" element={<DemoApp introContent={true} />} />
            </Routes>
        </Router>
    </React.StrictMode>
);
