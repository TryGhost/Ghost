import React from 'react';
import ReactDOM from 'react-dom/client';
import {
    HashRouter as Router,
    Routes,
    Route
} from 'react-router-dom';
import {DesignSandbox} from '../src';
import DemoApp from './DemoApp';
import RestrictedContentDemo from './RestrictedContentDemo';
import HtmlOutputDemo from './HtmlOutputDemo';
import './styles/demo.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Router>
            <Routes>
                <Route path="/designsandbox" element={<DesignSandbox />} />
                <Route path="/contentrestricted" element={<RestrictedContentDemo paragraphs={1} />} />
                <Route path="/html-output" element={<HtmlOutputDemo />} />
                <Route path="/" element={<DemoApp introContent={true} />} />
                <Route path="/basic" element={<DemoApp introContent={true} editorType='basic' />} />
                <Route path="/minimal" element={<DemoApp introContent={true} editorType='minimal' />} />
            </Routes>
        </Router>
    </React.StrictMode>
);
