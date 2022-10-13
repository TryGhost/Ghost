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
            <KoenigComposer>
                <Watermark />
                <div className="h-full grow overflow-auto">
                    <div className="mx-auto h-full max-w-2xl pt-[15vmin]">
                        <KoenigEditor
                            imageUploadFunc={imageUploader}
                        />
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
