import React from 'react';
import {KoenigComposer, KoenigEditor} from '../src';
import FloatingButton from './components/FloatingButton';
import SerializedStateTextarea from './components/SerializedStateTextarea';
import {useState} from 'react';
import Watermark from './components/Watermark';

function DemoApp() {
    const [sidebarState, setSidebarState] = useState(false);
    function openSidebar() {
        setSidebarState(!sidebarState);
    }

    const SidebarContainer = () => {
        if (sidebarState) {
            return (
                <div className="absolute bottom-0 right-0 flex h-full w-full max-w-md flex-col items-end gap-5">
                    <SerializedStateTextarea toggle={sidebarState} />
                </div>
            );
        }
    };

    return (
        <div className="koenig-lexical top">
            <KoenigComposer>
                <Watermark />
                <div className="h-full overflow-auto">
                    <div className="mx-auto h-full max-w-2xl pt-[15vmin]">
                        <KoenigEditor>
                        </KoenigEditor>
                    </div>
                </div>
                <SidebarContainer />
                <FloatingButton onClick={openSidebar} />
            </KoenigComposer>
        </div>
    );
}

export default DemoApp;
