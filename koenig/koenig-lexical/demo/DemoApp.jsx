import React from 'react';
import {KoenigComposer, KoenigEditor} from '../src';
import FloatingButton from './components/FloatingButton';
import {useState} from 'react';
import Watermark from './components/Watermark';
import {imageUploader} from './utils/imageUploader';
import Sidebar from './components/Sidebar';

function DemoApp() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarView, setSidebarView] = useState('json');

    function openSidebar(view = 'json') {
        if (isSidebarOpen && sidebarView === view) {
            return setIsSidebarOpen(false);
        }
        setSidebarView(view);
        setIsSidebarOpen(true);
    }

    return (
        <div className="koenig-lexical top">
            <KoenigComposer imageUploadFunction={{imageUploader}}>
                <Watermark />
                <div className="h-full grow overflow-auto">
                    <div className="mx-auto max-w-[740px] py-[15vmin]">
                        <textarea className="w-full min-w-[auto] mb-3 pb-1 text-black font-sans text-5xl font-bold resize-none overflow-hidden focus-visible:outline-none" placeholder="Post title" />
                        <KoenigEditor />
                    </div>
                </div>
                <div className="flex h-full flex-col items-end">
                    <Sidebar isOpen={isSidebarOpen} view={sidebarView} />
                    <FloatingButton onClick={openSidebar} />
                </div>
            </KoenigComposer>
        </div>
    );
}

export default DemoApp;
