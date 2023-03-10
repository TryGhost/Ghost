import './styles/demo.css';
import DemoApp from './DemoApp';
import HtmlOutputDemo from './HtmlOutputDemo';
import React from 'react';
import ReactDOM from 'react-dom/client';
import RestrictedContentDemo from './RestrictedContentDemo';
import {DesignSandbox} from '../src';
import {
    Route,
    HashRouter as Router,
    Routes
} from 'react-router-dom';

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
